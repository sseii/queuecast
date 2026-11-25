// 공연 목록 화면 (#7) — 티켓을 누르면 그 공연 화면이 펼쳐진다
import { loadShows } from "../data.js";
import { showCard } from "../components/showCard.js";
import { LEVELS, esc, fmtGenerated } from "../util.js";
import { stopCountdown } from "../components/dayPlan.js";

export async function renderList(app, mode) {
  document.body.dataset.theme = "";
  stopCountdown();
  const data = await loadShows(mode);
  setSources(data);
  if (!data) {
    app.innerHTML = emptyState(mode);
    return;
  }

  const shows = [...(data.shows ?? [])].sort((a, b) =>
    `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`)
  );
  const counts = Object.keys(LEVELS)
    .map((lv) => ({ lv, n: shows.filter((s) => (s.risk?.level ?? "safe") === lv).length }))
    .filter((c) => c.n > 0);

  const title = mode === "replay" ? "작년 그날, 미리 알았다면" : "어떤 공연 보러 가요?";
  const sub =
    mode === "replay"
      ? "2025년 실제 날씨로 다시 돌려 본 예보예요. 티켓을 눌러 보세요."
      : "티켓을 누르면 그날 줄 서는 시간의 날씨와 준비물이 펼쳐져요.";

  app.innerHTML = `
    <section class="intro">
      <h1>${title}</h1>
      <p>${sub}</p>
      <div class="intro-meta">
        <span class="updated">${fmtGenerated(data.generated_at)} 업데이트 · 사진 Pexels</span>
        ${counts
          .map((c) => `<span class="count-pill"><i class="dot lv-dot-${c.lv}"></i>${LEVELS[c.lv].ko} ${c.n}</span>`)
          .join("")}
      </div>
    </section>
    ${
      shows.length
        ? `<div class="ticket-grid">${shows.map((s) => showCard(s, mode)).join("")}</div>`
        : `<div class="empty"><p>앞으로 3일 안에 올림픽공원 공연이 없어요.</p></div>`
    }
    <details class="levels-help">
      <summary>단계는 어떻게 나눠요?</summary>
      <div class="levels-grid">
        <div><b>여름</b> 체감온도
          <ul>
            <li><i class="dot lv-dot-caution"></i>주의 33℃ 이상</li>
            <li><i class="dot lv-dot-warning"></i>경고 35℃ 이상</li>
            <li><i class="dot lv-dot-danger"></i>위험 38℃ 이상</li>
          </ul>
        </div>
        <div><b>겨울</b> 체감온도
          <ul>
            <li><i class="dot lv-dot-caution"></i>주의 영하 10℃ 이하</li>
            <li><i class="dot lv-dot-warning"></i>경고 영하 25℃ 이하</li>
          </ul>
        </div>
      </div>
      <p class="fine">기상청 폭염특보, 겨울철 체감온도 단계 기준</p>
    </details>
  `;
}

function setSources(data) {
  document.getElementById("sources").textContent = data
    ? [data.weather_source, data.show_source].filter(Boolean).map(esc).join(", ")
    : "";
}

function emptyState(mode) {
  return `
    <div class="empty">
      
      <p><b>${mode === "replay" ? "2025 사례 데이터를 준비하고 있어요" : "예보를 준비하고 있어요"}</b></p>
      <p class="fine">${mode === "replay" ? "replay_2025.json" : "forecast.json"} 파일이 생기면 여기에 표시돼요.</p>
    </div>`;
}
