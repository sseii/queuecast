"""forecast.json 생성 (docs/JSON_형식.md).

  python forecast.py            web/public/data/forecast.json 에 저장
  python forecast.py --stdout   화면에만 출력

엔진은 숫자와 단계만 쓴다. 문구는 web/public/data/actions.json 에만 둔다.
"""
import json
import math
import os
import re
import sys
import tempfile
import time
from datetime import date as Date, datetime, timedelta

import feel
import kma
import kopis
from common import KST, ApiError, get, now_kst

DAYS_AHEAD = 3
WAIT_HOURS = {"weekend": 4, "weekday": 2}   # 야외 대기 시작: 공연 시작 몇 시간 전부터 (분석 결과)
LATE_ARRIVAL_MIN = 90                       # caution 이상이면 공연 시작 90분 전 도착 권장

# 예정 공연은 실제 관객 수를 알 수 없어 공연장 객석 수를 쓴다 (docs/JSON_형식.md, 11/25 합의)
VENUE_AUDIENCE = {"KSPO DOME": 15000, "핸드볼경기장": 6500, "올림픽홀": 3000, "우리금융아트홀": 1200, "기타": None}
SCALE_LARGE, SCALE_MEDIUM = 10000, 5000     # 이상이면 large, medium, 그 아래 small
KOPIS_GAP_S = 0.3                           # KOPIS 호출 사이 최소 간격(초)
PARK = "올림픽공원"
MAX_FILL_GAP_H = 6                         # 보간할 때 앞뒤 값을 찾는 최대 거리 (단기예보 4일째는 3시간 간격)

# 공휴일 (대체공휴일 포함)
HOLIDAYS = {"2026-12-25", "2027-01-01", "2027-02-06", "2027-02-07", "2027-02-08", "2027-02-09", "2027-03-01"}

WEATHER_SOURCE = f"기상청 단기예보 (격자 nx={kma.NX}, ny={kma.NY} 송파구)"
SHOW_SOURCE = "KOPIS 공연목록"
OUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "web", "public", "data", "forecast.json")

ANALYSIS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "analysis")
FACILITY_TYPES = ("음수대", "화장실", "자판기", "간이편의점")
FACILITY_PER_TYPE = 3
_analysis_cache = {}

WEEKDAYS = "월화수목금토일"
_SEGMENT = re.compile(r"([^()]*)\(([^)]*)\)")
_TIME = re.compile(r"(\d{1,2}):(\d{2})")
_DAY = re.compile(r"([월화수목금토일])요일")


def _d(s):
    return Date.fromisoformat(s)


def day_type(d):
    """토·일·공휴일이면 weekend."""
    d = _d(d) if isinstance(d, str) else d
    return "weekend" if d.weekday() >= 5 or d.isoformat() in HOLIDAYS else "weekday"


def _days(label):
    """'화요일 ~ 금요일', '토요일, 일요일', 'HOL' → 요일 번호(0=월) 집합과 HOL 여부."""
    days, hol = set(), False
    for token in label.split(","):
        token = token.strip()
        if not token:
            continue
        if "HOL" in token.upper():
            hol = True
            continue
        found = [WEEKDAYS.index(c) for c in _DAY.findall(token)]
        if "~" in token and len(found) >= 2:
            a, b = found[0], found[-1]
            i = a
            while True:              # 금요일 ~ 월요일처럼 주를 넘어가도 처리
                days.add(i)
                if i == b:
                    break
                i = (i + 1) % 7
        else:
            days.update(found)
    return days, hol


def start_time(dtguidance, d):
    """KOPIS 공연시간 안내에서 그날 첫 회차 'HH:MM'. 못 찾으면 None."""
    if not dtguidance or not d:
        return None
    d = _d(d) if isinstance(d, str) else d
    by_day, by_hol = [], []
    for label, times in _SEGMENT.findall(dtguidance):
        ts = [f"{int(h):02d}:{m}" for h, m in _TIME.findall(times) if int(h) < 24 and int(m) < 60]
        if not ts:
            continue
        days, hol = _days(label)
        if hol:
            by_hol += ts
        if d.weekday() in days:
            by_day += ts
    if d.isoformat() in HOLIDAYS and by_hol:
        return min(by_hol)
    return min(by_day) if by_day else None


def parsable(dtguidance):
    """요일·시각을 하나라도 읽을 수 있는 안내인가. 읽히는데 그날 회차가 없으면 공연 없는 날이다."""
    for label, times in _SEGMENT.findall(dtguidance or ""):
        days, hol = _days(label)
        if _TIME.search(times) and (days or hol):
            return True
    return False


def scale(audience):
    """예상 대기 규모: 1만 이상 large, 5천 이상 medium, 그 아래 small, 모르면 None."""
    if audience is None:
        return None
    if audience >= SCALE_LARGE:
        return "large"
    if audience >= SCALE_MEDIUM:
        return "medium"
    return "small"


def _analysis(name):
    """analysis/ 의 팀장 분석 JSON. 없거나 깨졌으면 빈 dict (해당 필드는 null·[])."""
    if name not in _analysis_cache:
        try:
            with open(os.path.join(ANALYSIS_DIR, name), encoding="utf-8") as f:
                _analysis_cache[name] = json.load(f)
        except (OSError, ValueError):
            _log(f"analysis/{name} 을 읽지 못해 빈 값으로 둡니다")
            _analysis_cache[name] = {}
    return _analysis_cache[name]


def parking_eta(venue, dt_type, table=None):
    """analysis/parking_full_eta.json 의 [venue][day_type]["eta"]. 없거나 null이면 None."""
    table = _analysis("parking_full_eta.json") if table is None else table
    return ((table.get(venue) or {}).get(dt_type) or {}).get("eta") or None


def haversine_m(lat1, lng1, lat2, lng2):
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def nearest_facilities(venue, data=None):
    """공연장 좌표 기준 직선거리로 종류별 가까운 3개씩. 좌표가 없는 공연장(기타)은 []."""
    data = _analysis("facilities.json") if data is None else data
    c = (data.get("venues") or {}).get(venue)
    if not c:
        return []
    out = []
    for t in FACILITY_TYPES:
        near = sorted(((haversine_m(c["lat"], c["lng"], f["lat"], f["lng"]), f)
                       for f in data.get("facilities") or []
                       if f.get("type") == t and f.get("lat") is not None and f.get("lng") is not None),
                      key=lambda x: x[0])[:FACILITY_PER_TYPE]
        out += [{"type": t, "place": f.get("place"), "detail": f.get("detail"), "lat": f["lat"], "lng": f["lng"],
                 "distance_m": int(round(dist))} for dist, f in near]
    return out


def _hm(dt):
    return dt.strftime("%H:%M")


def _hourly(start_dt, wait_dt, season, weather):
    """대기 시작 정시 ~ 공연 시작 정시. 빈 정시는 앞뒤 값으로 선형 보간(filled=true).
    (행 목록, 못 채운 시각 수)를 돌려준다."""
    rows, missing = [], 0
    t = wait_dt.replace(minute=0)
    end = start_dt.replace(minute=0)
    while t <= end:
        v, filled = _slot(weather, t), False
        if v is None or v.get("temp") is None:
            v = _interpolate(weather, t)
            filled = v is not None
        if v is None:
            missing += 1
        else:
            f = feel.feel(v.get("temp"), v.get("humidity"), v.get("wind"), season)
            if f is None:
                missing += 1
            hum = v.get("humidity")
            rows.append({"time": _hm(t), "temp": v.get("temp"),
                         "humidity": int(round(hum)) if hum is not None else None,
                         "wind": v.get("wind"), "feel": f, "level": feel.level(f, season), "filled": filled})
        t += timedelta(hours=1)
    return rows, missing


def _slot(weather, t):
    return (weather.get(t.date().isoformat()) or {}).get(_hm(t))


def _neighbor(weather, t, step):
    """t에서 step(+1/-1)시간 방향으로 기온이 있는 가장 가까운 정시 (거리, 값)."""
    for k in range(1, MAX_FILL_GAP_H + 1):
        v = _slot(weather, t + timedelta(hours=step * k))
        if v is not None and v.get("temp") is not None:
            return k, v
    return None


def _interpolate(weather, t):
    """앞뒤 값이 둘 다 있을 때만 temp·humidity·wind를 선형 보간. 못 채우면 None."""
    before, after = _neighbor(weather, t, -1), _neighbor(weather, t, +1)
    if before is None or after is None:
        return None
    (a, pv), (b, nv) = before, after
    w = a / (a + b)
    out = {}
    for k in ("temp", "humidity", "wind"):
        x, y = pv.get(k), nv.get(k)
        out[k] = round(x + (y - x) * w, 1) if x is not None and y is not None else None
    return out


def _risk(hourly, season):
    rated = [h for h in hourly if h["level"] is not None]
    if not rated:
        return {"level": None, "peak_feel": None, "peak_time": None}
    sign = 1 if season == "summer" else -1   # 같은 단계면 여름은 더 더운, 겨울은 더 추운 시각
    peak = max(rated, key=lambda h: (feel.LEVEL_ORDER[h["level"]], sign * h["feel"]))
    return {"level": peak["level"], "peak_feel": peak["feel"], "peak_time": peak["time"]}


def build_show(detail, d, weather):
    """공연 상세 하나와 날짜 하나로 shows[] 항목 하나."""
    dt_type = day_type(d)
    season = feel.season(_d(d).month)
    venue = detail.get("venue") or "기타"
    audience = VENUE_AUDIENCE.get(venue)
    st = start_time(detail.get("time_guide"), d)
    show = {"id": detail.get("id"), "title": detail.get("title"), "genre": detail.get("genre"),
            "venue": venue, "date": d,
            "start_time": st, "day_type": dt_type, "foreign_audience": None,
            "wait_window": {"start": None, "end": None}, "season": season,
            "forecast_available": False, "data_status": "partial",
            "expected_audience": audience, "scale": scale(audience),
            "exposed_people": None,
            "risk": {"level": None, "peak_feel": None, "peak_time": None}, "hourly": [],
            "parking_full_eta": parking_eta(venue, dt_type), "recommended_arrival": None,
            "facilities": nearest_facilities(venue)}
    if st is None:
        return show
    start_dt = datetime.combine(_d(d), datetime.strptime(st, "%H:%M").time(), KST)
    wait_dt = start_dt - timedelta(hours=WAIT_HOURS[dt_type])
    show["wait_window"] = {"start": _hm(wait_dt), "end": st}
    hourly, missing = _hourly(start_dt, wait_dt, season, weather)
    show["data_status"] = "partial" if missing else "ok"
    if not any(h["feel"] is not None for h in hourly):
        return show
    risk = _risk(hourly, season)
    show.update(forecast_available=True, hourly=hourly, risk=risk)
    if risk["level"] == "safe":
        show["exposed_people"] = 0
        show["recommended_arrival"] = _hm(wait_dt)
    else:
        show["exposed_people"] = audience
        show["recommended_arrival"] = _hm(max(start_dt - timedelta(minutes=LATE_ARRIVAL_MIN), wait_dt))
    return show


def _dates(detail, today, last):
    lo = max(_d(detail["from"]), today) if detail.get("from") else today
    hi = min(_d(detail["to"]), last) if detail.get("to") else last
    d = lo
    while d <= hi:
        yield d.isoformat()
        d += timedelta(days=1)


def build(details, weather, now, weather_base):
    """API를 부르지 않는 순수 함수. weather는 kma.to_hourly 형식."""
    today = now.date()
    last = today + timedelta(days=DAYS_AHEAD)
    shows = [build_show(det, d, weather or {}) for det in details for d in _dates(det, today, last)
             if not (parsable(det.get("time_guide")) and start_time(det.get("time_guide"), d) is None)]
    shows.sort(key=lambda s: (s["date"], s["start_time"] or "99:99", s["id"] or ""))
    return {"generated_at": now.replace(microsecond=0).isoformat(), "weather_base": weather_base,
            "weather_source": WEATHER_SOURCE, "show_source": SHOW_SOURCE, "stale": False, "shows": shows}


def _overlaps(s, today, last):
    lo = _d(s["from"]) if s.get("from") else today
    hi = _d(s["to"]) if s.get("to") else last
    return lo <= last and hi >= today


def _log(msg):
    print(msg, file=sys.stderr)


def _retry(fn, *args, tries=3, wait=1.0):
    """KOPIS가 가끔 일시적으로 HTTP 400을 돌려줘서 몇 번 다시 시도한다."""
    for i in range(tries):
        try:
            return fn(*args)
        except ApiError:
            if i == tries - 1:
                raise
            time.sleep(wait * (i + 1))


_last_kopis_call = [0.0]


def _kopis_get(url, params, label, timeout=30):
    """KOPIS 호출 사이를 KOPIS_GAP_S 이상 띄운다 (목록 페이지·상세·재시도 모두 이 함수를 지난다)."""
    wait = _last_kopis_call[0] + KOPIS_GAP_S - time.monotonic()
    if wait > 0:
        time.sleep(wait)
    try:
        return get(url, params, label, timeout)
    finally:
        _last_kopis_call[0] = time.monotonic()


def in_park(detail):
    """상세 공연장명(fcltynm)에 '올림픽공원'이 있어야 남긴다."""
    return PARK in (detail.get("facility") or "")


def run():
    kopis.get = _kopis_get          # kopis.py는 그대로 두고 호출 간격만 감싼다
    now = now_kst()
    today = now.date()
    last = today + timedelta(days=DAYS_AHEAD)
    shows = _retry(kopis.fetch_list, today.strftime("%Y%m%d"), last.strftime("%Y%m%d"))
    shows = [s for s in shows if _overlaps(s, today, last)]
    _log(f"KOPIS 공연목록: 올림픽공원 {len(shows)}건 ({today}~{last})")
    details = []
    for s in shows:
        try:
            det = _retry(kopis.fetch_detail, s["id"])
        except ApiError as e:
            _log(f"  상세 건너뜀 {s['id']}: {e}")
            continue
        except Exception as e:          # 메시지에 URL이 섞일 수 있어 종류만 남긴다
            _log(f"  상세 건너뜀 {s['id']}: {type(e).__name__}")
            continue
        if not in_park(det):
            _log(f"  올림픽공원 밖 공연장 제외 {s['id']}: {det.get('facility')}")
            continue
        details.append(det)
    w = kma.fetch_hourly()          # 실패하면 main에서 직전 파일을 stale로 남긴다
    weather = w["hourly"]
    b = w["base_date"] + w["base_time"]
    weather_base = f"{b[:4]}-{b[4:6]}-{b[6:8]}T{b[8:10]}:{b[10:12]}:00+09:00"
    _log(f"기상청 단기예보: 발표 {weather_base}")
    return build(details, weather, now, weather_base)


def write_json(path, data):
    """임시 파일에 다 쓴 뒤 os.replace로 바꿔, 중간에 끊겨도 기존 파일이 깨지지 않게 한다."""
    d = os.path.dirname(path)
    os.makedirs(d, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=d, prefix=".forecast.", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
        os.replace(tmp, path)
    except BaseException:
        if os.path.exists(tmp):
            os.remove(tmp)
        raise


def mark_stale(path):
    """갱신 실패: 기존 파일의 stale만 true로 바꿔 저장. 기존 파일이 없거나 깨졌으면 아무것도 쓰지 않는다."""
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, ValueError):
        return False
    data["stale"] = True
    write_json(path, data)
    return True


def main(argv, out_path=None):
    path = out_path or os.path.normpath(OUT_PATH)
    try:
        data = run()
    except Exception as e:               # ApiError 메시지는 키·URL 없이 만든다. 그 밖의 예외는 종류만 남긴다
        _log(f"실패: {e if isinstance(e, ApiError) else type(e).__name__}")
        if "--stdout" not in argv:
            if mark_stale(path):
                _log("직전 forecast.json 유지, stale=true로 표시")
            else:
                _log("기존 forecast.json이 없어 아무것도 쓰지 않음")
        return 1
    if "--stdout" in argv:
        sys.stdout.reconfigure(errors="replace")
        print(json.dumps(data, ensure_ascii=False, indent=2))
    else:
        write_json(path, data)
        _log(f"저장: web/public/data/forecast.json (공연 {len(data['shows'])}건)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
