"""API 키 없이 실행: python -m unittest test_forecast -v (engine 폴더에서)."""
import csv
import os
import unittest
from datetime import datetime
from unittest import mock

import feel
import forecast
import kopis
from common import KST

REPLAY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "analysis", "replay_input.csv")
GUIDE = "화요일 ~ 금요일(19:30), 토요일 ~ 일요일(14:00,18:30), HOL(15:00)"


def _num(v):
    return float(v) if v not in ("", None) else None


def replay(day):
    """replay_input.csv에서 그날의 날씨(kma.to_hourly 형식)와 공연장명·시작 시각."""
    with open(REPLAY, encoding="utf-8-sig") as f:
        rows = [r for r in csv.DictReader(f) if r["date"] == day]
    weather = {day: {f"{int(r['hour']):02d}:00": {"temp": _num(r["temp"]), "humidity": _num(r["humidity"]),
                                                   "wind": _num(r["wind"])} for r in rows}}
    return weather, rows[0]["venue"], rows[0]["start_time"]


def build_one(day, guide, weather, venue_name):
    detail = {"id": "PFTEST", "title": "test", "venue": kopis.venue_code(venue_name), "from": day, "to": day,
              "time_guide": guide}
    now = datetime.fromisoformat(day + "T05:30:00").replace(tzinfo=KST)
    data = forecast.build([detail], weather, now, None)
    assert len(data["shows"]) == 1
    return data["shows"][0]


class LevelTest(unittest.TestCase):
    def test_summer_boundaries(self):
        self.assertEqual(feel.level(32.9, "summer"), "safe")
        self.assertEqual(feel.level(33, "summer"), "caution")
        self.assertEqual(feel.level(35, "summer"), "warning")
        self.assertEqual(feel.level(38, "summer"), "danger")

    def test_winter_boundaries(self):
        self.assertEqual(feel.level(-9.9, "winter"), "safe")
        self.assertEqual(feel.level(-10, "winter"), "caution")
        self.assertEqual(feel.level(-25, "winter"), "warning")

    def test_none(self):
        self.assertIsNone(feel.level(None, "summer"))

    def test_season(self):
        self.assertEqual(feel.season(5), "summer")
        self.assertEqual(feel.season(9), "summer")
        self.assertEqual(feel.season(10), "winter")
        self.assertEqual(feel.season(4), "winter")


class WinterFormulaTest(unittest.TestCase):
    def test_warm_returns_temp(self):
        self.assertEqual(feel.winter_feel(10.5, 5.0), 10.5)

    def test_calm_returns_temp(self):
        self.assertEqual(feel.winter_feel(-5.0, 1.2), -5.0)

    def test_applies_formula(self):
        self.assertEqual(feel.winter_feel(-5.0, 1.3), round(feel.winter_feel(-5.0, 1.3), 1))
        self.assertLess(feel.winter_feel(-5.0, 5.0), -5.0)

    def test_missing(self):
        self.assertIsNone(feel.winter_feel(None, 3.0))
        self.assertIsNone(feel.summer_feel(30.0, None))


class StartTimeTest(unittest.TestCase):
    def test_weekday_range(self):
        self.assertEqual(forecast.start_time(GUIDE, "2026-12-02"), "19:30")   # 수

    def test_weekend_earliest(self):
        self.assertEqual(forecast.start_time(GUIDE, "2026-12-05"), "14:00")   # 토

    def test_holiday(self):
        self.assertEqual(forecast.start_time(GUIDE, "2026-12-25"), "15:00")   # 금, 성탄절

    def test_no_show_day(self):
        self.assertIsNone(forecast.start_time(GUIDE, "2026-11-30"))           # 월

    def test_comma_list(self):
        self.assertEqual(forecast.start_time("토요일, 일요일(17:00)", "2026-12-06"), "17:00")

    def test_none(self):
        self.assertIsNone(forecast.start_time(None, "2026-12-02"))

    def test_unparsable(self):
        self.assertIsNone(forecast.start_time("추후 공지", "2026-12-02"))

    def test_day_type(self):
        self.assertEqual(forecast.day_type("2026-12-25"), "weekend")
        self.assertEqual(forecast.day_type("2026-12-05"), "weekend")
        self.assertEqual(forecast.day_type("2026-12-02"), "weekday")


class ReplayTest(unittest.TestCase):
    def test_2025_07_26_kspo(self):
        weather, venue, st = replay("2025-07-26")
        self.assertEqual(st, "18:00")
        s = build_one("2025-07-26", "토요일(18:00)", weather, venue)
        self.assertEqual(s["venue"], "KSPO DOME")
        self.assertEqual(s["day_type"], "weekend")
        self.assertEqual(s["wait_window"], {"start": "14:00", "end": "18:00"})
        self.assertEqual(s["season"], "summer")
        self.assertEqual(len(s["hourly"]), 5)
        self.assertEqual(s["risk"]["level"], "warning")
        self.assertEqual(s["recommended_arrival"], "16:30")
        self.assertTrue(s["forecast_available"])

    def test_2025_02_07_olympic_hall(self):
        weather, venue, st = replay("2025-02-07")
        self.assertEqual(st, "20:00")
        s = build_one("2025-02-07", "금요일(20:00)", weather, venue)
        self.assertEqual(s["venue"], "올림픽홀")
        self.assertEqual(s["day_type"], "weekday")
        self.assertEqual(s["wait_window"], {"start": "18:00", "end": "20:00"})
        self.assertEqual(s["season"], "winter")
        self.assertEqual(s["risk"]["level"], "caution")
        self.assertEqual(s["recommended_arrival"], "18:30")
        self.assertEqual(s["expected_audience"], 3000)
        self.assertEqual(s["scale"], "small")
        self.assertEqual(s["exposed_people"], 3000)   # caution → 객석 수

    def test_2025_07_26_kspo_audience(self):
        weather, venue, _ = replay("2025-07-26")
        s = build_one("2025-07-26", "토요일(18:00)", weather, venue)
        self.assertEqual((s["expected_audience"], s["scale"], s["exposed_people"]), (15000, "large", 15000))


class ScaleTest(unittest.TestCase):
    def test_boundaries(self):
        self.assertEqual(forecast.scale(4999), "small")
        self.assertEqual(forecast.scale(5000), "medium")
        self.assertEqual(forecast.scale(9999), "medium")
        self.assertEqual(forecast.scale(10000), "large")
        self.assertIsNone(forecast.scale(None))

    def test_venue_table(self):
        self.assertEqual(forecast.VENUE_AUDIENCE["핸드볼경기장"], 6500)
        self.assertEqual(forecast.scale(forecast.VENUE_AUDIENCE["핸드볼경기장"]), "medium")
        self.assertEqual(forecast.scale(forecast.VENUE_AUDIENCE["우리금융아트홀"]), "small")
        self.assertIsNone(forecast.VENUE_AUDIENCE["기타"])


def w(temp, hum=50.0, wind=2.0):
    return {"temp": temp, "humidity": hum, "wind": wind}


class FillTest(unittest.TestCase):
    DAY = "2026-11-29"            # 일요일, "일요일(17:00)" → 대기 13:00~17:00
    NOW = datetime(2026, 11, 26, 5, 30, tzinfo=KST)

    def show(self, hours):
        detail = {"id": "F", "venue": "KSPO DOME", "from": self.DAY, "to": self.DAY, "time_guide": "일요일(17:00)"}
        return forecast.build([detail], {self.DAY: hours}, self.NOW, None)["shows"][0]

    def test_interpolate_3_hourly(self):
        s = self.show({"12:00": w(3.0, 40.0, 1.0), "15:00": w(6.0, 70.0, 4.0), "18:00": w(0.0, 70.0, 4.0)})
        self.assertEqual([h["time"] for h in s["hourly"]], ["13:00", "14:00", "15:00", "16:00", "17:00"])
        self.assertEqual([h["filled"] for h in s["hourly"]], [True, True, False, True, True])
        h13 = s["hourly"][0]
        self.assertEqual((h13["temp"], h13["humidity"], h13["wind"]), (4.0, 50, 2.0))
        self.assertEqual(s["hourly"][4]["temp"], 2.0)                         # 15시 6℃ → 18시 0℃의 2/3
        self.assertEqual(h13["feel"], feel.feel(4.0, 50.0, 2.0, "winter"))   # 채운 값으로 체감 계산
        self.assertEqual(s["data_status"], "ok")
        self.assertTrue(s["forecast_available"])

    def test_partial_when_no_after_value(self):
        s = self.show({"12:00": w(3.0), "15:00": w(6.0)})
        self.assertEqual([h["time"] for h in s["hourly"]], ["13:00", "14:00", "15:00"])
        self.assertEqual(s["data_status"], "partial")

    def test_ok_when_full(self):
        s = self.show({f"{h:02d}:00": w(5.0) for h in range(13, 18)})
        self.assertEqual(s["data_status"], "ok")
        self.assertFalse(any(h["filled"] for h in s["hourly"]))

    def test_partial_when_no_start_time(self):
        s = build_one("2026-12-05", "추후 공지", {}, "올림픽공원 (올림픽홀)")
        self.assertEqual(s["data_status"], "partial")


class BuildTest(unittest.TestCase):
    def test_no_weather(self):
        s = build_one("2026-12-05", GUIDE, {}, "올림픽공원 (올림픽홀)")
        self.assertFalse(s["forecast_available"])
        self.assertEqual(s["risk"], {"level": None, "peak_feel": None, "peak_time": None})
        self.assertEqual(s["hourly"], [])
        self.assertIsNone(s["recommended_arrival"])
        self.assertEqual(s["wait_window"], {"start": "10:00", "end": "14:00"})

    def test_unparsable_start(self):
        s = build_one("2026-12-05", "추후 공지", {}, "올림픽공원 (올림픽홀)")
        self.assertIsNone(s["start_time"])
        self.assertEqual(s["wait_window"], {"start": None, "end": None})

    def test_exposed_people(self):
        weather, venue, _ = replay("2025-02-07")
        with mock.patch.dict(forecast.VENUE_AUDIENCE, {"올림픽홀": 9000}):
            s = build_one("2025-02-07", "금요일(20:00)", weather, venue)
        self.assertEqual(s["risk"]["level"], "caution")
        self.assertEqual(s["expected_audience"], 9000)
        self.assertEqual(s["exposed_people"], 9000)

    def test_range_and_sort(self):
        details = [{"id": "B", "venue": "올림픽홀", "from": "2026-11-20", "to": "2026-12-31", "time_guide": GUIDE},
                   {"id": "A", "venue": "KSPO DOME", "from": "2026-11-26", "to": "2026-11-26",
                    "time_guide": "목요일(18:00)"}]
        now = datetime(2026, 11, 25, 5, 30, tzinfo=KST)
        data = forecast.build(details, {}, now, None)
        keys = [(s["date"], s["id"]) for s in data["shows"]]
        # B: 11/25(수)~11/28(토), A: 11/26(목) 18:00 이 B 19:30 보다 먼저
        self.assertEqual(keys, [("2026-11-25", "B"), ("2026-11-26", "A"), ("2026-11-26", "B"),
                                ("2026-11-27", "B"), ("2026-11-28", "B")])
        self.assertIsNone(data["weather_base"])

    def test_genre(self):
        details = [{"id": "G", "title": "마술쇼", "genre": "서커스/마술", "venue": "우리금융아트홀",
                    "from": "2026-11-28", "to": "2026-11-28", "time_guide": "토요일(15:00)"},
                   {"id": "N", "venue": "기타", "from": "2026-11-28", "to": "2026-11-28", "time_guide": "토요일(18:00)"}]
        now = datetime(2026, 11, 25, 5, 30, tzinfo=KST)
        shows = forecast.build(details, {}, now, None)["shows"]
        self.assertTrue(all("genre" in s for s in shows))
        self.assertEqual([s["genre"] for s in shows], ["서커스/마술", None])   # 없으면 키는 두고 null

    def test_skip_no_show_day(self):
        details = [{"id": "W", "venue": "기타", "from": "2026-11-20", "to": "2026-12-31",
                    "time_guide": "토요일 ~ 일요일(15:00)"},
                   {"id": "U", "venue": "기타", "from": "2026-11-25", "to": "2026-11-25", "time_guide": "추후 공지"}]
        now = datetime(2026, 11, 25, 5, 30, tzinfo=KST)
        keys = [(s["date"], s["id"], s["start_time"]) for s in forecast.build(details, {}, now, None)["shows"]]
        # W는 토(11/28)만, 해석 못 하는 U는 null로 남긴다
        self.assertEqual(keys, [("2026-11-25", "U", None), ("2026-11-28", "W", "15:00")])


if __name__ == "__main__":
    unittest.main()
