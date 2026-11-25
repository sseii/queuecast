// 공연 티켓 (#7). 왼쪽은 공연 분위기 사진, 오른쪽 절취선 뒤 스텁에 체감온도
import { esc, dateParts, mood, round, LEVELS, THEMES, themeOf, vtName, dday } from "../util.js";
import { art } from "./art.js";
import { photosFor, photoImg } from "../photos.js";

export function showCard(show, mode, { mini = false } = {}) {
  const level = show.risk?.level ?? "safe";
  const theme = themeOf(show);
  const m = mood(show, level);
  const d = dateParts(show.date);
  const dd = mode === "replay" ? null : dday(show);
  const href = `#/${mode === "replay" ? "replay" : "show"}/${encodeURIComponent(show.id)}`;
  const hint = level === "safe" ? "편하게 오셔도 돼요" : `${esc(show.recommended_arrival ?? "-")} 이후 도착 추천`;
  const [photo] = photosFor(theme, show.id, 1);

  return `
  <a class="ticket theme-${theme} ${mini ? "ticket-mini" : ""}" href="${href}" data-id="${esc(show.id)}"
     style="view-transition-name:${vtName(show.id)}">
    <div class="ticket-body">
      ${art(theme, show.id, mini ? 300 : 420, mini ? 150 : 230)}
      ${photoImg(photo, mini ? 500 : 800)}
      <div class="ticket-text">
        <div class="ticket-top">
          <span class="theme-chip">${THEMES[theme].ko}</span>
          ${dd ? `<span class="dday">${dd}</span>` : ""}
        </div>
        <h3>${esc(show.title)}</h3>
        <p class="ticket-when"><b>${d.md}</b> ${d.wd} ${esc(show.start_time)}<span class="sep"></span>${esc(show.venue)}
          ${show.foreign_audience ? `<span class="en-tag" title="해외 관객이 많은 공연">EN</span>` : ""}</p>
        ${mini ? "" : `<p class="ticket-hint">${hint}</p>`}
      </div>
    </div>
    <div class="ticket-stub lv-stub-${esc(level)}">
      <span class="stub-label">대기 체감</span>
      <span class="stub-temp">${round(show.risk?.peak_feel)}°</span>
      <span class="stub-level">${LEVELS[level]?.ko ?? ""}${mini ? "" : ` · ${m.ko}`}</span>
    </div>
  </a>`;
}
