"""API 응답 확인용. 키는 환경변수 DATAGOKR_KEY·KOPIS_KEY에서 읽고, 화면에 키를 출력하지 않는다.

  python check_apis.py           기상청 + KOPIS 모두
  python check_apis.py kma       기상청 단기예보만
  python check_apis.py kopis     KOPIS 목록·상세만

응답 요약은 engine/out/ 에 JSON으로 저장한다 (커밋하지 않음).
"""
import json
import os
import sys

import kma
import kopis
from common import ApiError

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")


def save(name, data):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  → 저장: engine/out/{name}")


def check_kma():
    print(f"[기상청 단기예보] nx={kma.NX}, ny={kma.NY}")
    res = kma.fetch_hourly()
    print(f"  발표 {res['base_date']} {res['base_time']}")
    for day, hours in res["hourly"].items():
        temps = [v["temp"] for v in hours.values() if v["temp"] is not None]
        missing = sum(1 for v in hours.values() for x in v.values() if x is None)
        print(f"  {day}: {len(hours)}시간, 기온 {min(temps)}~{max(temps)}℃, 빈 값 {missing}개")
    first_day = next(iter(res["hourly"]))
    for t, v in list(res["hourly"][first_day].items())[:3]:
        print(f"    {first_day} {t} {v}")
    save("kma_hourly.json", res)


def check_kopis():
    print("[KOPIS 공연목록] 서울 송파구, 오늘~30일, 올림픽공원만")
    shows = kopis.fetch_list()
    print(f"  {len(shows)}건")
    for s in shows[:10]:
        print(f"  {s['id']} | {s['from']}~{s['to']} | {s['title']}")
    details = []
    for s in shows[:3]:
        d = kopis.fetch_detail(s["id"])
        details.append(d)
        print(f"[KOPIS 상세] {d['id']} {d['title']}\n    공연장: {d['facility']} → {d['venue']}\n"
              f"    공연시간 안내: {d['time_guide']}\n    러닝타임: {d['runtime']}")
    save("kopis_shows.json", {"shows": shows, "details": details})


if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else "all"
    ok = True
    for name, fn in (("kma", check_kma), ("kopis", check_kopis)):
        if which in ("all", name):
            try:
                fn()
            except ApiError as e:
                ok = False
                print(f"  실패: {e}")
    sys.exit(0 if ok else 1)
