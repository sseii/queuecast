# 큐캐스트(QueueCast) · 데이터 형식 (엔진 ↔ 웹)

엔진(수하)은 `web/public/data/` 폴더에 JSON 파일을 만들고, 웹(채린)은 그 파일을 읽어 화면에 표시한다.
파일은 세 개다.

| 파일 | 만드는 사람 | 바뀌는 주기 | 내용 |
|---|---|---|---|
| `forecast.json` | 수하 (엔진, 자동) | 매일 05:30·17:30, 공연 당일 3시간마다 | 예정 공연별 대기 시간대 체감온도와 위험 단계 |
| `replay_2025.json` | 수하 (1회 생성) | 고정 | 2025년 사례일 재현 (데모용, 형식은 forecast.json과 같음) |
| `actions.json` | 팀장 (직접 작성) | 거의 안 바뀜 | 단계별 대응 조치 문구, 관객 안내 문구 (한·영) |

엔진은 **숫자와 단계만**, 문구는 **actions.json에서만** 관리한다. 문구를 고칠 때 엔진을 다시 돌릴 필요가 없다.

---

## 1. forecast.json

엔진(PR #21)이 실제로 만드는 구조를 기준으로 한다. **(추가 예정)** 표시는 11/25에 합의한 추가 필드다.

```json
{
  "generated_at": "2026-11-25T15:07:51+09:00",
  "weather_base": "2026-11-25T14:00:00+09:00",
  "weather_source": "기상청 단기예보 (격자 nx=62, ny=126 송파구)",
  "show_source": "KOPIS 공연목록",
  "stale": false,
  "shows": [
    {
      "id": "PF301499",
      "title": "조용필 & 위대한 탄생 전국투어 콘서트 [서울]",
      "genre": "대중음악",
      "venue": "KSPO DOME",
      "date": "2026-11-28",
      "start_time": "18:00",
      "day_type": "weekend",
      "foreign_audience": null,
      "wait_window": { "start": "14:00", "end": "18:00" },
      "season": "winter",
      "forecast_available": true,
      "data_status": "ok",
      "expected_audience": 15000,
      "scale": "large",
      "exposed_people": 0,
      "risk": { "level": "safe", "peak_feel": 3.4, "peak_time": "18:00" },
      "hourly": [
        { "time": "14:00", "temp": 8.0, "humidity": 50, "wind": 2.0, "feel": 6.8, "level": "safe" },
        { "time": "15:00", "temp": 8.0, "humidity": 50, "wind": 2.0, "feel": 6.8, "level": "safe" }
      ],
      "parking_full_eta": "15:00",
      "recommended_arrival": "14:00",
      "facilities": [
        { "type": "화장실", "place": "KSPO DOME", "detail": "1번 게이트 옆", "lat": 37.5197, "lng": 127.1273, "distance_m": 80 }
      ]
    }
  ]
}
```

### 필드 설명
| 필드 | 타입 | 설명 |
|---|---|---|
| `generated_at` | 문자열 (ISO 시각) | 엔진이 파일을 만든 시각 |
| `weather_base` | 문자열 (ISO 시각) | 사용한 기상청 단기예보의 발표 시각. 웹 상단에 "○월 ○일 ○시 발표 예보 기준"으로 표시 |
| `stale` **(추가 예정)** | 불리언 | API 장애로 이번 갱신에 실패해 직전 예보를 그대로 둔 경우 true → 웹은 기준 시각을 강조 표시 |
| `shows[].id` | 문자열 | KOPIS 공연 ID. **같은 공연이 여러 날이면 id가 겹치므로, 웹에서 목록 key는 `id + date`로 쓴다** |
| `title`, `genre` | 문자열 | 공연명, KOPIS 장르 |
| `venue` | 문자열 | KSPO DOME / 올림픽홀 / 핸드볼경기장 / 우리금융아트홀 / 기타. **올림픽공원 밖 공연장은 목록에서 제외** |
| `date`, `start_time` | 문자열 | `YYYY-MM-DD`, `HH:MM` |
| `day_type` | `"weekday"` / `"weekend"` | 주말·공휴일이면 weekend |
| `foreign_audience` | 불리언 또는 null | 영문 공연정보(해외 예매처)에 같은 공연이 있으면 true. 아직 대조 전이면 null |
| `wait_window` | 객체 | 기본 대기 시간대. 주말·휴일 시작 4시간 전, 평일 2시간 전부터 시작 시각까지 (엔진 설정값) |
| `season` | `"summer"` / `"winter"` | 5~9월 summer, 그 외 winter |
| `forecast_available` | 불리언 | 공연일이 단기예보 범위 안이면 true. false면 웹은 "공연 3일 전부터 예보가 표시됩니다" 안내 |
| `data_status` **(추가 예정)** | `"ok"` / `"partial"` | 대기 시간대 중 기상값이 빈 시각이 있거나 시작 시각을 못 찾은 경우 partial → 웹은 "일부 시간 예보 없음" 표시 |
| `expected_audience` | 숫자 또는 null | 예정 공연은 실제 관객 수를 알 수 없으므로 **공연장 객석 수**를 넣는다: KSPO DOME 15000, 핸드볼경기장 6500, 올림픽홀 3000, 우리금융아트홀 1200, 그 외 null |
| `scale` | `"large"` / `"medium"` / `"small"` / null | 예상 대기 규모(대·중·소). expected_audience 1만 이상 large, 5천~1만 미만 medium, 5천 미만 small |
| `exposed_people` | 숫자 | 엔진 내부 참고값. **화면에는 인원수로 표시하지 않고** `scale`(대·중·소)만 보여준다 |
| `risk` | 객체 | `level` 대기 시간대 중 가장 높은 단계, `peak_feel`·`peak_time` 그때의 체감온도와 시각 |
| `hourly[]` | 배열 | 대기 시간대의 시간별 값. `temp` 기온(℃), `humidity` 습도(%), `wind` 풍속(m/s), `feel` 체감온도(℃), `level` 단계. `filled`가 true면 기상청 값이 없는 정시를 앞뒤 값으로 선형 보간한 행이다 |
| `parking_full_eta` | 문자열 또는 null | 만차 예상 시각. `analysis/parking_full_eta.json`(공연장 × 평일/주말)에서 찾아 넣음. 이력이 없으면 null → 웹은 "대중교통 이용 권장" |
| `recommended_arrival` | 문자열 | 권장 도착 시각. 안전이면 대기 시간대 시작, 주의 이상이면 입장 시작 직전으로 늦춤 |
| `facilities[]` | 배열 | 공연장 기준 가까운 음수대·화장실·자판기·간이편의점 최대 3개씩 (`analysis/facilities.json`, 직선거리) |

### 단계 코드 (`level`)
| 코드 | 한글 | 여름 기준 (체감) | 겨울 기준 (체감) | 화면 색 |
|---|---|---|---|---|
| `safe` | 안전 | 33℃ 미만 | 영하 10℃ 초과 | 초록 |
| `caution` | 주의 | 33℃ 이상 | 영하 10℃ 이하 | 노랑 |
| `warning` | 경고 | 35℃ 이상 | 영하 25℃ 이하 | 주황 |
| `danger` | 위험 | 38℃ 이상 | (없음) | 빨강 |

- 여름 기준은 기상청 폭염특보(주의보 33℃, 경보 35℃, 중대경보 38℃), 겨울 기준은 기상청 겨울철 체감온도 단계(주의 영하 10℃, 경고 영하 25℃)를 참고한다.
- 겨울은 주의·경고 **2단계만** 쓴다 (기상청 겨울철 체감온도 '위험'은 영하 45℃ 미만이라 서울에서 사실상 없음).
- 이 단계는 큐캐스트 자체 단계다. 기상청 공식 특보와 같은 것이 아니므로 화면에 "특보"라는 말을 쓰지 않는다.

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
- 채린은 수하의 엔진이 완성되기 전까지 이 문서의 예시 JSON을 `web/public/data/forecast.json`에 넣고 작업한다.
- 인증키는 코드·커밋·단톡방에 넣지 않는다. 엔진은 GitHub Secrets(`DATAGOKR_KEY`, `KOPIS_KEY`)에서 읽는다.
