"""replay.py 테스트 (API 키 필요 없음): python -m unittest -v (engine 폴더에서)."""
import unittest
from datetime import datetime

import forecast
import replay
from common import KST

NOW = datetime(2026, 11, 26, 9, 0, tzinfo=KST)


class ReplayJsonTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = replay.build(replay.read_csv(), NOW)
        cls.shows = {s["date"]: s for s in cls.data["shows"]}

    def test_top_level(self):
        d = self.data
        self.assertEqual(list(d), list(forecast.build([], {}, NOW, None)))      # 키와 순서가 forecast.json과 같다
        self.assertIsNone(d["weather_base"])
        self.assertEqual(d["weather_source"], "2025 연계 데이터 기상값 (사례 재현)")
        self.assertEqual(d["show_source"], "KOPIS 공연상세")
        self.assertFalse(d["stale"])
        self.assertEqual([s["date"] for s in d["shows"]], ["2025-02-07", "2025-07-26"])

    def test_2025_07_26(self):
        s = self.shows["2025-07-26"]
        self.assertEqual(s["id"], "replay-2025-07-26")
        self.assertEqual(s["title"], "BOYNEXTDOOR TOUR [KNOCK ON Vol.1] FINAL")
        self.assertEqual((s["genre"], s["venue"], s["start_time"]), ("대중음악", "KSPO DOME", "18:00"))
        self.assertEqual(s["day_type"], "weekend")
        self.assertEqual(s["wait_window"], {"start": "14:00", "end": "18:00"})
        self.assertEqual(len(s["hourly"]), 5)
        self.assertEqual(s["risk"]["level"], "warning")
        self.assertEqual(s["recommended_arrival"], "16:30")
        self.assertEqual(s["actual_audience"], 12218)
        self.assertEqual((s["expected_audience"], s["scale"], s["exposed_people"]), (15000, "large", 15000))
        self.assertEqual(s["parking_full_eta"], "13:00")
        self.assertEqual(s["data_status"], "ok")
        self.assertTrue(s["facilities"])

    def test_2025_02_07(self):
        s = self.shows["2025-02-07"]
        self.assertEqual(s["title"], "2025 검정치마 단독공연 SONGS TO BRING YOU HOME")
        self.assertEqual((s["venue"], s["start_time"]), ("올림픽홀", "20:00"))
        self.assertEqual(s["day_type"], "weekday")
        self.assertEqual(s["wait_window"], {"start": "18:00", "end": "20:00"})
        self.assertEqual(s["season"], "winter")
        self.assertEqual(s["risk"]["level"], "caution")
        self.assertEqual(s["actual_audience"], 5152)

    def test_same_show_keys_as_forecast(self):
        detail = {"id": "X", "venue": "KSPO DOME", "from": "2026-11-28", "to": "2026-11-28",
                  "time_guide": "토요일(18:00)"}
        fs = forecast.build([detail], {}, NOW, None)["shows"][0]
        self.assertIsNone(fs["actual_audience"])
        for s in self.data["shows"]:
            self.assertEqual(list(s), list(fs))

    def test_clean_title(self):
        self.assertEqual(replay.clean_title("2025 검정치마 단독공연 SONGS TO BRING YOU HOME\n,"),
                         "2025 검정치마 단독공연 SONGS TO BRING YOU HOME")
        self.assertIsNone(replay.clean_title(""))


if __name__ == "__main__":
    unittest.main()
