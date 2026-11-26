// 공연 목록 화면 (#7)
//  ① 첫 화면(사진 배경 + 제목 + 오늘 예보 요약)  ② 바로가기 4칸  ③ 공연 티켓 목록
//  티켓을 누르면 그 공연 화면이 펼쳐진다
import { loadShows } from "../data.js";
import { showCard } from "../components/showCard.js";
import { LEVELS, fmtGenerated, fmtBase, levelName, levelOf } from "../util.js";
import { t } from "../i18n.js";
import { icon } from "../components/icons.js";
import { stopCountdown } from "../components/dayPlan.js";
import { HERO_PHOTO, photoImg } from "../photos.js";

export async function renderList(app, mode) {
  document.body.dataset.theme = "";
  stopCountdown();
  const data = await loadShows(mode);

  const shows = [...(data?.shows ?? [])].sort((a, b) =>
    `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`)
  );
  const counts = Object.keys(LEVELS)
    .map((lv) => ({ lv, n: shows.filter((s) => levelOf(s) === lv).length }))
    .filter((c) => c.n > 0);

  app.innerHTML = `
    <section class="hero-band ${mode === "replay" ? "is-replay" : ""}">
      ${photoImg(HERO_PHOTO, 1800, "photo hero-photo")}
      <div class="wrap hero-band-inner">
        <h1>${t(`list.title.${mode}`)}</h1>
        <p class="hero-sub">${t(`list.sub.${mode}`)}</p>
        ${
          data
            ? `<div class="hero-meta">
                ${updatedLine(data)}
                ${counts.map((c) => `<span class="count-pill"><i class="dot lv-dot-${c.lv}"></i>${levelName(c.lv)} ${c.n}</span>`).join("")}
              </div>`
            : ""
        }
      </div>
    </section>

    <nav class="quick" aria-label="${t("quick.label")}">
      ${quick("ticket", t("quick.shows"), t("quick.shows.sub", { n: shows.length }), mode === "replay" ? "#/replay" : "#/", "tickets")}
      ${quick("thermo", t("quick.levels"), t("quick.levels.sub"), "#/about/levels")}
      ${quick("medical", t("quick.guide"), t("quick.guide.sub"), "#/about/guide")}
      ${
        mode === "replay"
          ? quick("spark", t("quick.forecast"), t("quick.forecast.sub"), "#/")
          : quick("clock", t("quick.replay"), t("quick.replay.sub"), "#/replay")
      }
    </nav>

    <section class="list-section" id="sec-tickets">
      <div class="section-head">
        <h2>${t(`list.head.${mode}`)}</h2>
        <p>${t(`list.lead.${mode}`)}</p>
      </div>
      ${
        !data
          ? `<div class="empty"><p><b>${t(`list.loading.${mode}`)}</b></p>
              <p class="fine">${t("list.loading.sub", { f: mode === "replay" ? "replay_2025.json" : "forecast.json" })}</p></div>`
          : shows.length
            ? `<div class="ticket-grid">${shows.map((s) => showCard(s, mode)).join("")}</div>`
            : `<div class="empty"><p>${t("list.none")}</p></div>`
      }
    </section>
  `;

  // 바로가기 "공연 예보"는 같은 화면 아래 티켓 목록으로 이동
  app.querySelector('[data-scroll="tickets"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("sec-tickets").scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function quick(ic, title, sub, href, scroll) {
  return `
    <a class="quick-tile" href="${href}" ${scroll ? `data-scroll="${scroll}"` : ""}>
      <span class="quick-ico">${icon[ic](26)}</span>
      <span class="quick-text"><b>${title}</b><small>${sub}</small></span>
    </a>`;
}

// 기준 시각: 예보 발표 시각(weather_base) 우선. stale 이면 강조해서 "최신 예보를 못 받았다"고 알림
export function updatedLine(data) {
  const base = fmtBase(data.weather_base);
  if (data.stale) {
    return `<span class="updated is-stale">${icon.clock(16)}${t("list.stale", { t: base ?? fmtGenerated(data.generated_at) })}</span>`;
  }
  const when = base ? t("list.base", { t: base }) : data.generated_at ? t("list.updated", { t: fmtGenerated(data.generated_at) }) : "";
  return when ? `<span class="updated">${when}</span>` : "";
}
