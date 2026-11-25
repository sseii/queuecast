"""KOPIS 공연목록(pblprfr)·공연상세(pblprfr/{mt20id}) 조회.

목록은 서울 송파구(signgucode=11, signgucodesub=1171)로 받은 뒤 공연장명에 '올림픽공원'이 있는 것만 남긴다.
한 번에 조회할 수 있는 기간은 최대 31일.
"""
import xml.etree.ElementTree as ET
from datetime import timedelta

from common import ApiError, env_key, get, now_kst

LIST_URL = "https://www.kopis.or.kr/openApi/restful/pblprfr"
DETAIL_URL = "https://www.kopis.or.kr/openApi/restful/pblprfr/{}"
SIDO, GUGUN = "11", "1171"          # 서울, 송파구
PARK = "올림픽공원"
VENUES = [("KSPO DOME", "KSPO DOME"), ("체조", "KSPO DOME"), ("올림픽홀", "올림픽홀"),
          ("핸드볼", "핸드볼경기장"), ("우리금융아트홀", "우리금융아트홀")]


def _xml(text, label):
    try:
        root = ET.fromstring(text)
    except ET.ParseError:
        raise ApiError(f"{label} 응답이 XML이 아님: {text[:200]}") from None
    err = root.findtext(".//errmsg") or root.findtext(".//returncode")
    if err and root.find(".//mt20id") is None:
        raise ApiError(f"{label} 오류: {err}")
    return root


def _text(el, tag):
    v = el.findtext(tag)
    v = v.strip() if v else ""
    return v or None


def _date(v):
    """'2026.12.20' → '2026-12-20'."""
    return v.replace(".", "-") if v else None


def venue_code(fcltynm):
    for word, code in VENUES:
        if fcltynm and word in fcltynm:
            return code
    return "기타"


def fetch_list(stdate=None, eddate=None, rows=100, only_park=True):
    """stdate~eddate(YYYYMMDD, 기본 오늘~30일 뒤) 송파구 공연목록."""
    key = env_key("KOPIS_KEY")
    today = now_kst()
    stdate = stdate or today.strftime("%Y%m%d")
    eddate = eddate or (today + timedelta(days=30)).strftime("%Y%m%d")
    shows, page = [], 1
    while True:
        root = _xml(get(LIST_URL, {"service": key, "stdate": stdate, "eddate": eddate, "cpage": page,
                                   "rows": rows, "signgucode": SIDO, "signgucodesub": GUGUN},
                        "KOPIS 공연목록"), "KOPIS 공연목록")
        dbs = root.findall("db")
        for db in dbs:
            shows.append({"id": _text(db, "mt20id"), "title": _text(db, "prfnm"),
                          "facility": _text(db, "fcltynm"),  # 목록은 '올림픽공원'까지만 → 공연장은 상세에서
                          "from": _date(_text(db, "prfpdfrom")), "to": _date(_text(db, "prfpdto")),
                          "genre": _text(db, "genrenm"), "state": _text(db, "prfstate")})
        if len(dbs) < rows:
            break
        page += 1
    if only_park:
        shows = [s for s in shows if s["facility"] and PARK in s["facility"]]
    return shows


def fetch_detail(mt20id):
    """공연 상세. dtguidance(공연시간 안내)는 원문 그대로 둔다 — 시작 시각 해석은 엔진에서."""
    key = env_key("KOPIS_KEY")
    root = _xml(get(DETAIL_URL.format(mt20id), {"service": key}, "KOPIS 공연상세"), "KOPIS 공연상세")
    db = root.find("db")
    if db is None:
        raise ApiError(f"KOPIS 공연상세 {mt20id} 결과 없음")
    return {"id": _text(db, "mt20id"), "title": _text(db, "prfnm"), "facility": _text(db, "fcltynm"),
            "facility_id": _text(db, "mt10id"), "venue": venue_code(_text(db, "fcltynm")),
            "from": _date(_text(db, "prfpdfrom")), "to": _date(_text(db, "prfpdto")),
            "runtime": _text(db, "prfruntime"), "time_guide": _text(db, "dtguidance"),
            "genre": _text(db, "genrenm"), "state": _text(db, "prfstate")}
