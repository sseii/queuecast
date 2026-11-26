// 공연 티켓 (#7). 왼쪽은 공연 분위기 사진, 오른쪽 절취선 뒤 스텁에 체감온도
import { esc, dateParts, mood, round, levelName, venueName, themeOf, vtName, dday, levelOf, showKey } from "../util.js";
import { themeChips } from "./chips.js";
import { t } from "../i18n.js";
import { art } from "./art.js";
import { photosFor, photoImg } from "../photos.js";

export function showCard(show, mode, { mini = false, view = "fan" } = {}) {
  const level = levelOf(show);
  const theme = themeOf(show);
  const d = dateParts(show.date);
  const dd = mode === "replay" ? null : dday(show);
  const href = `#/${mode === "replay" ? "replay" : "show"}/${encodeURIComponent(showKey(show))}${view === "org" ? "/org" : ""}`;
  const hint = level === "pending" ? t("ticket.hint.pending") : level === "safe" || !show.recommended_arrival ? t("ticket.hint.safe") : t("ticket.hint", { t: esc(show.recommended_arrival) });
  const [photo] = photosFor(theme, show.id, 1);

  return `
  <a class="ticket theme-${theme} ${mini ? "ticket-mini" : ""}" href="${href}" data-id="${esc(showKey(show))}"
     style="view-transition-name:${vtName(showKey(show))}">
    <div class="ticket-body">
      ${art(theme, show.id, mini ? 300 : 420, mini ? 150 : 230)}
      ${photoImg(photo, mini ? 500 : 800)}
      <div class="ticket-text">
        <div class="ticket-top">
          ${themeChips(show, theme)}
          ${dd ? `<span class="dday">${dd}</span>` : ""}
        </div>
        <h3>${esc(show.title)}</h3>
        <p class="ticket-when"><b>${d.md}</b> ${d.wd} ${esc(show.start_time)}<span class="sep"></span>${esc(venueName(show.venue))}
          ${show.foreign_audience ? `<span class="en-tag" title="${t("ticket.en")}">EN</span>` : ""}</p>
        ${
          mini
            ? ""
            : `<p class="ticket-hint">${hint}</p>`
        }
      </div>
    </div>
    <div class="ticket-stub lv-stub-${esc(level)}">
      <span class="stub-label">${t("ticket.feel")}</span>
      <span class="stub-temp">${round(show.risk?.peak_feel)}${show.risk?.peak_feel == null ? "" : "°"}</span>
      <span class="stub-level">${levelName(level)}${mini || level === "pending" ? "" : ` · ${mood(show, level)}`}</span>
    </div>
  </a>`;
}
