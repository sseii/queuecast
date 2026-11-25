# 큐캐스트(QueueCast) · 데이터 형식 (엔진 ↔ 웹)

엔진(A)은 `web/public/data/` 폴더에 JSON 파일을 만들고, 웹(B)은 그 파일을 읽어 화면에 표시한다.
파일은 세 개다.

| 파일 | 만드는 사람 | 바뀌는 주기 | 내용 |
|---|---|---|---|
| `forecast.json` | A (엔진, 자동) | 매일 05:30·17:30 | 예정 공연별 대기 시간대 체감온도와 위험 단계 |
| `replay_2025.json` | A (1회 생성) | 고정 | 2025년 사례일 재현 (데모용, 형식은 forecast.json과 같음) |
| `actions.json` | 팀장 (직접 작성) | 거의 안 바뀜 | 단계별 대응 조치 문구, 관객 안내 문구 (한·영) |

엔진은 **숫자와 단계만**, 문구는 **actions.json에서만** 관리한다. 문구를 고칠 때 엔진을 다시 돌릴 필요가 없다.

---

## 1. forecast.json

```json
{
  "generated_at": "2026-11-24T05:30:00+09:00",
  "weather_base": "2026-11-24T05:00:00+09:00",
  "weather_source": "기상청 단기예보 (격자 nx=62, ny=126 송파구)",
  "show_source": "KOPIS 공연목록",
  "shows": [
    {
      "id": "PF280001",
      "title": "DAY6 Special Concert: The Present",
      "venue": "KSPO DOME",
      "date": "2026-12-20",
      "start_time": "18:00",
      "day_type": "weekend",
      "foreign_audience": true,
      "wait_window": { "start": "14:00", "end": "18:00" },
      "season": "winter",
      "forecast_available": true,
      "expected_audience": 15000,
      "exposed_people": 15000,
      "risk": {
        "level": "caution",
        "peak_feel": -11.2,
        "peak_time": "17:00"
      },
      "hourly": [
        { "time": "14:00", "temp": -4.0, "humidity": 55, "wind": 3.8, "feel": -9.1, "level": "safe" },
        { "time": "15:00", "temp": -4.5, "humidity": 55, "wind": 4.5, "feel": -10.3, "level": "caution" },
        { "time": "16:00", "temp": -5.0, "humidity": 60, "wind": 4.7, "feel": -10.9, "level": "caution" },
        { "time": "17:00", "temp": -5.5, "humidity": 60, "wind": 4.6, "feel": -11.2, "level": "caution" },
        { "time": "18:00", "temp": -6.0, "humidity": 65, "wind": 3.9, "feel": -11.0, "level": "caution" }
      ],
      "parking_full_eta": "15:00",
      "recommended_arrival": "16:30",
      "facilities": [
        { "type": "화장실", "place": "KSPO DOME", "detail": "1번 게이트 옆", "lat": 37.5197, "lng": 127.1273, "distance_m": 80 },
        { "type": "음수대", "place": "평화의 광장", "detail": "광장 입구", "lat": 37.5205, "lng": 127.1229, "distance_m": 320 },
        { "type": "자판기", "place": "KSPO DOME", "detail": "매표소 앞", "lat": 37.5193, "lng": 127.1270, "distance_m": 60 }
      ]
    }
  ]
}
```
(위 값은 형식 예시용 가짜 숫자다.)

### 필드 설명
| 필드 | 타입 | 설명 |
|---|---|---|
| `generated_at` | 문자열 (ISO 시각) | 엔진이 파일을 만든 시각. 웹 상단에 "○시 기준"으로 표시 |
| `weather_base` | 문자열 (ISO 시각, +09:00) 또는 null | 사용한 기상청 단기예보 발표 시각. 예보를 못 받았으면 null |
| `shows[]` | 배열 | 올림픽공원 공연을 오늘~3일 뒤(D-3~당일) 공연일마다 하나씩. 날짜·시작 시각 순으로 정렬 |
| `shows[].id` | 문자열 | KOPIS 공연 ID (mt20id) |
| `title` | 문자열 | 공연명 |
| `venue` | 문자열 | 공연장. KSPO DOME / 올림픽홀 / 핸드볼경기장 / 우리금융아트홀 / 기타 |
| `date`, `start_time` | 문자열 | `YYYY-MM-DD`, `HH:MM` (KOPIS 상세조회의 공연시간). 하루 여러 회차면 첫 회차. 공연시간 안내를 해석하지 못하면 `start_time`·`wait_window`·`risk` 값이 null |
| `day_type` | `"weekday"` / `"weekend"` | 주말·공휴일이면 weekend |
| `foreign_audience` | 불리언 | 영문 공연정보(해외 예매처)에 같은 공연이 있으면 true → 웹에서 영문 안내를 먼저 보여줌 |
| `wait_window` | 객체 | 야외 대기 시간대. 주말은 시작 4시간 전부터, 평일은 시작 2시간 전부터 시작 시각까지 (분석 결과 기준, 엔진 상수로 둠) |
| `season` | `"summer"` / `"winter"` | 5~9월 summer, 그 외 winter |
| `forecast_available` | 불리언 | 대기 시간대에 예보 값이 하나라도 있으면 true. false면 `risk` 값은 null, `hourly`는 `[]` |
| `expected_audience` | 정수 또는 null | 공연장별 예상 관객 수. 엔진 상수표 `VENUE_AUDIENCE`에서 가져온다 |
| `exposed_people` | 정수 또는 null | 예상 노출 인원. `risk.level`이 caution 이상이면 `expected_audience`, safe면 0, 모르면 null |
| `risk.level` | 단계 코드 | 대기 시간대 중 가장 위험한 시각의 단계 |
| `risk.peak_feel`, `peak_time` | 숫자, 문자열 | 가장 위험한 시각의 체감온도(℃)와 그 시각 |
| `hourly[]` | 배열 | 대기 시간대의 시간별 값. `temp` 기온(℃), `humidity` 습도(%), `wind` 풍속(m/s), `feel` 체감온도(℃), `level` 그 시각의 단계 |
| `parking_full_eta` | 문자열 또는 null | 만차 예상 시각 (혼잡도·연계 데이터 기반, 계산 불가면 null) |
| `recommended_arrival` | 문자열 | 권장 도착 시각. safe면 대기 시작 시각, caution 이상이면 공연 시작 90분 전 |
| `facilities[]` | 배열 | 공연장에서 가까운 음수대·화장실·자판기 최대 3개씩 (편의시설 정보, 직선거리) |

### 단계 코드 (`level`)
| 코드 | 한글 | 여름 기준 (체감) | 겨울 기준 (체감) | 화면 색 |
|---|---|---|---|---|
| `safe` | 안전 | 33℃ 미만 | 영하 10℃ 초과 | 초록 |
| `caution` | 주의 | 33℃ 이상 | 영하 10℃ 이하 | 노랑 |
| `warning` | 경고 | 35℃ 이상 | 영하 25℃ 이하 | 주황 |
| `danger` | 위험 | 38℃ 이상 | (없음) | 빨강 |

여름 기준은 기상청 폭염특보(주의보 33℃, 경보 35℃, 중대경보 38℃), 겨울 기준은 기상청 겨울철 체감온도 단계(주의 영하 10℃, 경고 영하 25℃)를 따른다.

### 체감온도 공식 (엔진)
- 여름(5~9월): Stull 습구온도 Tw를 구한 뒤
  `체감 = -0.2442 + 0.55399·Tw + 0.45535·Ta - 0.0022·Tw² + 0.00278·Tw·Ta + 3.0`
- 겨울(10~4월): 기온 10℃ 이하, 풍속 1.3m/s 이상일 때
  `체감 = 13.12 + 0.6215·Ta - 11.37·V^0.16 + 0.3965·V^0.16·Ta` (V는 km/h, 풍속 m/s × 3.6). 조건 밖이면 기온 그대로.
- kspo_check.py의 `cmd_heat` 계산과 같은 식이다.

---

## 2. actions.json (팀장 작성)

```json
{
  "summer": {
    "caution": {
      "org": ["대기 구역 급수대 설치", "그늘막 추가 배치", "MD 판매 대기 줄 30분 단위 순환"],
      "audience": {
        "ko": "공연 당일 오후 체감온도가 {peak_feel}℃까지 오릅니다. {recommended_arrival} 이후 도착을 권장하며, 물과 양산을 챙겨 주세요.",
        "en": "Feels-like temperature will reach {peak_feel}°C in the afternoon. We recommend arriving after {recommended_arrival}. Please bring water and a parasol."
      }
    },
    "warning": { "org": [], "audience": { "ko": "", "en": "" } },
    "danger":  { "org": [], "audience": { "ko": "", "en": "" } }
  },
  "winter": {
    "caution": { "org": [], "audience": { "ko": "", "en": "" } },
    "warning": { "org": [], "audience": { "ko": "", "en": "" } }
  }
}
```
- `org`: 공단·주최사 대응 카드에 보일 조치 목록
- `audience`: 관객 안내 문구. `{peak_feel}`, `{recommended_arrival}`, `{parking_full_eta}`는 웹이 forecast.json 값으로 바꿔 넣는다.
- `safe` 단계는 카드 없이 "특이사항 없음"만 표시.

---

## 3. 정해진 규칙
- 시각은 모두 한국시간, 24시간 표기 `HH:MM`.
- 값이 없으면 키를 빼지 말고 `null`로 둔다.
- 필드를 추가하는 건 자유, **이름을 바꾸거나 지우는 건 단톡방에서 먼저 합의**.
- B는 A의 엔진이 완성되기 전까지 이 문서의 예시 JSON을 `web/public/data/forecast.json`에 넣고 작업한다.
- 인증키는 코드·커밋·단톡방에 넣지 않는다. 엔진은 GitHub Secrets(`DATAGOKR_KEY`, `KOPIS_KEY`)에서 읽는다.
