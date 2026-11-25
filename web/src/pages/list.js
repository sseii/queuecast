// 공연 목록 화면 (#7) — 티켓을 누르면 그 공연 화면이 펼쳐진다
import { loadShows } from "../data.js";
import { showCard } from "../components/showCard.js";
import { LEVELS, esc, fmtGenerated, levelName } from "../util.js";
import { t } from "../i18n.js";
import { stopCountdown } from "../components/dayPlan.js";

export async function renderList(app, mode) {
  document.body.dataset.theme = "";
  stopCountdown();
  const data = await loadShows(mode);
  setSources(data);
  if (!data) {
    app.innerHTML = `
      <div class="empty">
        <p><b>${t(`list.loading.${mode}`)}</b></p>
        <p class="fine">${t("list.loading.sub", { f: mode === "replay" ? "replay_2025.json" : "forecast.json" })}</p>
      </div>`;
    return;
  }

  const shows = [...(data.shows ?? [])].sort((a, b) =>
    `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`)
  );
  const counts = Object.keys(LEVELS)
    .map((lv) => ({ lv, n: shows.filter((s) => (s.risk?.level ?? "safe") === lv).length }))
    .filter((c) => c.n > 0);

  app.innerHTML = `
    <section class="intro">
      <h1>${t(`list.title.${mode}`)}</h1>
      <p>${t(`list.sub.${mode}`)}</p>
      <div class="intro-meta">
        <span class="updated">${t("list.updated", { t: fmtGenerated(data.generated_at) })} · ${t("list.photos")}</span>
        ${counts.map((c) => `<span class="count-pill"><i class="dot lv-dot-${c.lv}"></i>${levelName(c.lv)} ${c.n}</span>`).join("")}
      </div>
    </section>
    ${
      shows.length
        ? `<div class="ticket-grid">${shows.map((s) => showCard(s, mode)).join("")}</div>`
        : `<div class="empty"><p>${t("list.none")}</p></div>`
    }
    <details class="levels-help">
      <summary>${t("levels.q")}</summary>
      <div class="levels-grid">
        <div><b>${t("levels.summer")}</b>
          <ul>
            <li><i class="dot lv-dot-caution"></i>${t("levels.s1")}</li>
            <li><i class="dot lv-dot-warning"></i>${t("levels.s2")}</li>
            <li><i class="dot lv-dot-danger"></i>${t("levels.s3")}</li>
          </ul>
        </div>
        <div><b>${t("levels.winter")}</b>
          <ul>
            <li><i class="dot lv-dot-caution"></i>${t("levels.w1")}</li>
            <li><i class="dot lv-dot-warning"></i>${t("levels.w2")}</li>
          </ul>
        </div>
      </div>
      <p class="fine">${t("levels.src")}</p>
    </details>
  `;
}

function setSources(data) {
  document.getElementById("sources").textContent = data
    ? [data.weather_source, data.show_source].filter(Boolean).map(esc).join(", ")
    : "";
}
