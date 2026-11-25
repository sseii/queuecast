"""2025 사례 재현: analysis/replay_input.csv → web/public/data/replay_2025.json (이슈 #6).

  python replay.py            (API 키 필요 없음)

형식은 forecast.json과 같다. 체감온도·단계·대기 시간대 계산은 forecast.build_show를 그대로 쓴다.
CSV의 wind 칸은 원본 이름이 '풍향'이지만 실제 값은 풍속(m/s)이라 풍속으로 쓴다.
"""
import csv
import os
import sys
from collections import defaultdict
from datetime import date as Date

import forecast
import kopis
from common import now_kst

HERE = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(HERE, "..", "analysis", "replay_input.csv")
OUT_PATH = os.path.join(HERE, "..", "web", "public", "data", "replay_2025.json")
WEATHER_SOURCE = "2025 연계 데이터 기상값 (사례 재현)"
SHOW_SOURCE = "KOPIS 공연상세"
GENRE = "대중음악"


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def clean_title(s):
    """CSV 공연명 끝의 쉼표·줄바꿈 정리."""
    return " ".join((s or "").split()).rstrip(", ").strip() or None


def read_csv(path=CSV_PATH):
    with open(path, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    by_date = defaultdict(list)
    for r in rows:
        by_date[r["date"]].append(r)
    return by_date


def replay_show(day, rows):
    """사례일 하나 → shows[] 항목 하나."""
    weather = {day: {f"{int(r['hour']):02d}:00": {"temp": _num(r["temp"]), "humidity": _num(r["humidity"]),
                                                   "wind": _num(r["wind"])} for r in rows}}
    title = next((clean_title(r["show"]) for r in rows if clean_title(r["show"])), None)
    venue_name = next((r["venue"] for r in rows if r["venue"]), None)
    start = next((r["start_time"] for r in rows if r["start_time"]), None)
    wd = forecast.WEEKDAYS[Date.fromisoformat(day).weekday()]
    detail = {"id": f"replay-{day}", "title": title, "genre": GENRE, "venue": kopis.venue_code(venue_name),
              "from": day, "to": day, "time_guide": f"{wd}요일({start})" if start else None}
    show = forecast.build_show(detail, day, weather)
    audience = [a for a in (_num(r["audience"]) for r in rows) if a is not None]
    show["actual_audience"] = int(max(audience)) if audience else None
    return show


def build(by_date, now):
    shows = sorted((replay_show(d, rows) for d, rows in by_date.items()),
                   key=lambda s: (s["date"], s["start_time"] or "99:99"))
    return {"generated_at": now.replace(microsecond=0).isoformat(), "weather_base": None,
            "weather_source": WEATHER_SOURCE, "show_source": SHOW_SOURCE, "stale": False, "shows": shows}


def main():
    data = build(read_csv(), now_kst())
    forecast.write_json(os.path.normpath(OUT_PATH), data)
    print(f"저장: web/public/data/replay_2025.json (사례 {len(data['shows'])}건)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
