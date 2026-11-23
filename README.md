# 큐캐스트 (QueueCast)

2026 한국체육산업개발(주) 공공데이터 활용 경진대회 출품작 · 팀 33도

올림픽공원 공연 관객이 야외에서 기다리는 시간대의 폭염·한파 위험을 3일 전부터 예보하고,
공단·주최사에는 단계별 대응 카드를, 관객에게는 도착·준비 안내(한·영)를 제공하는 웹 서비스.

- 데모: https://sseii.github.io/queuecast/
- 마감: 2026-12-01(화) 18:00 / 팀 목표: 12-01 오전 제출

## 동작 구조

```
기상청 단기예보 ─┐
KOPIS 공연목록 ──┼─▶ engine/ (체감온도·위험 단계 계산) ─▶ web/public/data/forecast.json ─▶ web/ (화면)
영문 공연정보 ───┤        GitHub Actions 매일 05:30·17:30 자동 실행
편의시설 정보 ───┘
```

데이터 형식은 [`docs/JSON_형식.md`](docs/JSON_형식.md)를 기준으로 한다.

## 역할

| 역할 | 담당 | 브랜치 |
|---|---|---|
| 팀장 (데이터·문서 총괄) | 분석·그림, 대응 문구(actions.json), 기획서 1·2·4·7장, 제출 | `docs` |
| A (예보 엔진) | API 호출, 체감온도·단계 계산, forecast.json 자동 생성, 기획서 6장 | `engine` |
| B (웹 데모) | 공연 카드·대응 카드·관객 안내·편의시설 화면, 기획서 3·5장 | `web` |

## 폴더 구조

| 폴더 | 내용 | 담당 |
|---|---|---|
| `engine/` | 예보 엔진 (Python) | A |
| `web/` | 웹 서비스 (Vite). main 에 push 되면 자동 배포 | B |
| `web/public/data/` | 엔진이 만든 JSON (forecast.json, replay_2025.json), 팀장이 쓴 actions.json | A, 팀장 |
| `analysis/` | 2025년 데이터 분석 코드 | 팀장 |
| `scripts/` | 공공데이터 내려받기·점검 스크립트 (kspo_check.py) | 팀장 |
| `docs/` | 기획서, 데이터 형식 문서, 회의록 | 팀장 |

## 브랜치 규칙

- `main` 은 배포용. 직접 push 하지 않고 Pull Request 로 합친다.
- 각자 작업 브랜치: `engine`, `web`, `docs`
- 작업 → commit → 자기 브랜치에 push → GitHub 에서 Pull Request → 한 명 이상 확인 후 merge
- 커밋 메시지: `타입(영역): 내용 (#이슈번호)` 예) `feat(engine): 체감온도 계산 추가 (#2)`
- 작업 시작 전 항상 'git pull origin main'으로 main 최신 내용을 내 브랜치에 받는다.

## 실행 방법

웹
```
cd web
npm install
npm run dev
```
브라우저에서 표시되는 주소(http://localhost:5173/queuecast/)로 접속.

엔진 (로컬 테스트)
```
cd engine
pip install -r requirements.txt
set DATAGOKR_KEY=본인_공공데이터포털_키
set KOPIS_KEY=본인_KOPIS_키
python forecast.py
```

## 절대 하지 말 것

- API 키를 코드·커밋·단톡에 올리지 않는다. 키는 로컬 환경변수·`keys.json`(gitignore 처리)이나 GitHub Secrets(`DATAGOKR_KEY`, `KOPIS_KEY`)에만 둔다.
- 원천 CSV(입출차 등)를 커밋하지 않는다 (GitHub 파일 하나 100MB 제한). 분석 결과 요약 CSV·JSON만 올린다.
