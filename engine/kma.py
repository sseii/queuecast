"""기상청 단기예보 (공공데이터포털 VilageFcstInfoService_2.0 / getVilageFcst).

송파구 올림픽공원 격자 nx=62, ny=126. 기온(TMP ℃)·습도(REH %)·풍속(WSD m/s)만 쓴다.
결과는 {"YYYY-MM-DD": {"HH:MM": {"temp": .., "humidity": .., "wind": ..}}}, 값이 없으면 None.
"""
import json
import xml.etree.ElementTree as ET
from datetime import timedelta

from common import ApiError, env_key, get, now_kst

URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst"
NX, NY = 62, 126
BASE_HOURS = (2, 5, 8, 11, 14, 17, 20, 23)  # 하루 8회 발표, 발표 10분 뒤부터 조회 가능
CATEGORIES = {"TMP": "temp", "REH": "humidity", "WSD": "wind"}


def latest_base(now=None):
    """지금 조회할 수 있는 가장 최근 발표 시각 (base_date, base_time)."""
    t = (now or now_kst()) - timedelta(minutes=10)
    for h in reversed(BASE_HOURS):
        if t.hour >= h:
            return t.strftime("%Y%m%d"), f"{h:02d}00"
    return (t - timedelta(days=1)).strftime("%Y%m%d"), "2300"


def _error_msg(text):
    """키 오류 등은 JSON 대신 XML로 오므로 메시지만 꺼낸다."""
    try:
        root = ET.fromstring(text)
        for tag in ("returnAuthMsg", "resultMsg", "errMsg"):
            el = root.find(f".//{tag}")
            if el is not None and el.text:
                return el.text
    except ET.ParseError:
        pass
    return text[:200]


def _page(key, base_date, base_time, nx, ny, page, rows):
    text = get(URL, {"serviceKey": key, "pageNo": page, "numOfRows": rows, "dataType": "JSON",
                     "base_date": base_date, "base_time": base_time, "nx": nx, "ny": ny}, "기상청 단기예보")
    try:
        d = json.loads(text)["response"]
    except (ValueError, KeyError):
        raise ApiError(f"기상청 단기예보 응답 오류: {_error_msg(text)}") from None
    head = d.get("header", {})
    if head.get("resultCode") != "00":
        raise ApiError(f"기상청 단기예보 {head.get('resultCode')} {head.get('resultMsg')}")
    body = d.get("body", {})
    items = (body.get("items") or {}).get("item", [])
    return items, int(body.get("totalCount", 0))


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def fetch_raw(nx=NX, ny=NY, base=None):
    """발표 하나의 item 목록 전체 (페이지 넘김 포함)와 사용한 발표 시각."""
    key = env_key("DATAGOKR_KEY")
    base_date, base_time = base or latest_base()
    rows, page, items = 1000, 1, []
    while True:
        got, total = _page(key, base_date, base_time, nx, ny, page, rows)
        items += got
        if len(items) >= total or not got:
            break
        page += 1
    return {"base_date": base_date, "base_time": base_time, "nx": nx, "ny": ny, "items": items}


def to_hourly(raw):
    out = {}
    for it in raw["items"]:
        field = CATEGORIES.get(it.get("category"))
        if not field:
            continue
        d, t = it["fcstDate"], it["fcstTime"]
        day = f"{d[:4]}-{d[4:6]}-{d[6:]}"
        slot = out.setdefault(day, {}).setdefault(f"{t[:2]}:{t[2:]}", {"temp": None, "humidity": None, "wind": None})
        slot[field] = _num(it.get("fcstValue"))
    return {d: dict(sorted(h.items())) for d, h in sorted(out.items())}


def fetch_hourly(nx=NX, ny=NY, base=None):
    raw = fetch_raw(nx, ny, base)
    return {"base_date": raw["base_date"], "base_time": raw["base_time"], "hourly": to_hourly(raw)}
