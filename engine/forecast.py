"""forecast.json 생성 (docs/JSON_형식.md).

  python forecast.py            web/public/data/forecast.json 에 저장
  python forecast.py --stdout   화면에만 출력

엔진은 숫자와 단계만 쓴다. 문구는 web/public/data/actions.json 에만 둔다.
"""
import json
import os
import re
import sys
import time
from datetime import date as Date, datetime, timedelta

import feel
import kma
import kopis
from common import KST, ApiError, now_kst

DAYS_AHEAD = 3
WAIT_HOURS = {"weekend": 4, "weekday": 2}   # 야외 대기 시작: 공연 시작 몇 시간 전부터 (분석 결과)
LATE_ARRIVAL_MIN = 90                       # caution 이상이면 공연 시작 90분 전 도착 권장

# 2025 연계 공연관람객수 기준, 팀장 분석값으로 채운다
VENUE_AUDIENCE = {"KSPO DOME": None, "올림픽홀": None, "핸드볼경기장": None, "우리금융아트홀": None, "기타": None}

# 공휴일 (대체공휴일 포함)
HOLIDAYS = {"2026-12-25", "2027-01-01", "2027-02-06", "2027-02-07", "2027-02-08", "2027-02-09", "2027-03-01"}

WEATHER_SOURCE = f"기상청 단기예보 (격자 nx={kma.NX}, ny={kma.NY} 송파구)"
SHOW_SOURCE = "KOPIS 공연목록"
OUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "web", "public", "data", "forecast.json")

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


def _hm(dt):
    return dt.strftime("%H:%M")


def _hourly(start_dt, wait_dt, season, weather):
    """대기 시작 정시 ~ 공연 시작 정시, 단기예보에 있는 시각만."""
    rows = []
    t = wait_dt.replace(minute=0)
    end = start_dt.replace(minute=0)
    while t <= end:
        v = (weather.get(t.date().isoformat()) or {}).get(_hm(t))
        if v is not None:
            f = feel.feel(v.get("temp"), v.get("humidity"), v.get("wind"), season)
            hum = v.get("humidity")
            rows.append({"time": _hm(t), "temp": v.get("temp"),
                         "humidity": int(round(hum)) if hum is not None else None,
                         "wind": v.get("wind"), "feel": f, "level": feel.level(f, season)})
        t += timedelta(hours=1)
    return rows


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
            "forecast_available": False, "expected_audience": audience, "exposed_people": None,
            "risk": {"level": None, "peak_feel": None, "peak_time": None}, "hourly": [],
            "parking_full_eta": None, "recommended_arrival": None, "facilities": []}
    if st is None:
        return show
    start_dt = datetime.combine(_d(d), datetime.strptime(st, "%H:%M").time(), KST)
    wait_dt = start_dt - timedelta(hours=WAIT_HOURS[dt_type])
    show["wait_window"] = {"start": _hm(wait_dt), "end": st}
    hourly = _hourly(start_dt, wait_dt, season, weather)
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
            "weather_source": WEATHER_SOURCE, "show_source": SHOW_SOURCE, "shows": shows}


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


def run():
    now = now_kst()
    today = now.date()
    last = today + timedelta(days=DAYS_AHEAD)
    shows = _retry(kopis.fetch_list, today.strftime("%Y%m%d"), last.strftime("%Y%m%d"))
    shows = [s for s in shows if _overlaps(s, today, last)]
    _log(f"KOPIS 공연목록: 올림픽공원 {len(shows)}건 ({today}~{last})")
    details = []
    for s in shows:
        try:
            details.append(_retry(kopis.fetch_detail, s["id"]))
        except ApiError as e:
            _log(f"  상세 건너뜀 {s['id']}: {e}")
        except Exception as e:          # 메시지에 URL이 섞일 수 있어 종류만 남긴다
            _log(f"  상세 건너뜀 {s['id']}: {type(e).__name__}")
    try:
        w = kma.fetch_hourly()
        weather = w["hourly"]
        b = w["base_date"] + w["base_time"]
        weather_base = f"{b[:4]}-{b[4:6]}-{b[6:8]}T{b[8:10]}:{b[10:12]}:00+09:00"
        _log(f"기상청 단기예보: 발표 {weather_base}")
    except ApiError as e:
        _log(f"기상청 단기예보 실패, 예보 없이 생성: {e}")
        weather, weather_base = {}, None
    return build(details, weather, now, weather_base)


def main(argv):
    try:
        data = run()
    except ApiError as e:
        _log(f"실패: {e}")
        return 1
    text = json.dumps(data, ensure_ascii=False, indent=2)
    if "--stdout" in argv:
        sys.stdout.reconfigure(errors="replace")
        print(text)
    else:
        path = os.path.normpath(OUT_PATH)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(text + "\n")
        _log(f"저장: web/public/data/forecast.json (공연 {len(data['shows'])}건)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
