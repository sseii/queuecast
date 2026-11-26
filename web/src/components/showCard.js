// 공연 티켓 (#7). 왼쪽은 공연 분위기 사진, 오른쪽 절취선 뒤 스텁에 체감온도
import { esc, dateParts, mood, round, levelName, venueName, themeOf, vtName, dday, levelOf, showKey, isChilly } from "../util.js";
import { themeChips } from "./chips.js";
import { t } from "../i18n.js";
import { art } from "./art.js";
import { photosFor, pickPhoto, photoImg } from "../photos.js";

export function showCard(show, mode, { mini = false, view = "fan", used = null } = {}) {
  const level = levelOf(show);
  const theme = themeOf(show);
  const d = dateParts(show.date);
  const dd = mode === "replay" ? null : dday(show);
  const href = `#/${mode === "replay" ? "replay" : "show"}/${encodeURIComponent(showKey(show))}${view === "org" ? "/org" : ""}`;
  const hint =
    level === "pending" ? t("ticket.hint.pending")
    : isChilly(show, level) ? t("ticket.hint.warm")
    : level === "safe" || !show.recommended_arrival ? t("ticket.hint.safe")
    : t("ticket.hint", { t: esc(show.recommended_arrival) });
  const ww = show.wait_window?.start && show.wait_window?.end ? t("ticket.wait", { a: esc(show.wait_window.start), b: esc(show.wait_window.end) }) : "";
  const photo = used ? pickPhoto(show, used) : photosFor(show, 1)[0];

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
        ${ww && !mini ? `<p class="ticket-wait">${ww}</p>` : ""}
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

// ── 목록에서 같은 공연(같은 KOPIS id) 여러 날짜를 카드 1장으로 묶기 ──
// 카드 내용은 가장 가까운 날짜 기준. 날짜 칩을 누르면 그 날짜의 상세 화면(#/show/id_날짜)으로 간다.
// 상세 화면·주소·체크 저장은 날짜별 그대로라 손대지 않는다.
export function groupShows(shows) {
  const groups = new Map();
  for (const s of shows) {
    if (!groups.has(s.id)) groups.set(s.id, []);
    groups.get(s.id).push(s);
  }
  return [...groups.values()]; // shows 가 날짜순이면 묶음도 첫 날짜순
}

export function groupCard(dates, mode, view = "fan", used = null) {
  const first = dates[0];
  if (dates.length === 1) return showCard(first, mode, { view, used });
  const base = `#/${mode === "replay" ? "replay" : "show"}/`;
  const tail = view === "org" ? "/org" : "";
  const chips = dates
    .map((s) => {
      const d = dateParts(s.date);
      const lv = levelOf(s);
      return `<a class="date-chip" href="${base}${encodeURIComponent(showKey(s))}${tail}" data-vt="${vtName(showKey(s))}"
        title="${esc(`${d.md} ${s.start_time ?? ""} · ${levelName(lv)}`)}"><i class="dot lv-dot-${esc(lv)}"></i>${d.md}<small>${d.wd}</small></a>`;
    })
    .join("");
  // showCard 의 <a> 를 <div> 로 바꾸고, 카드 전체를 덮는 링크 + 그 위의 날짜 칩
  return showCard(first, mode, { view, used })
    .replace(/^\s*<a class="ticket /, '<div class="ticket is-group ')
    .replace(/<\/a>\s*$/, "</div>")
    .replace(/ href="[^"]*" data-id=/, " data-id=")
    .replace('<div class="ticket-body">', `<a class="ticket-link" href="${base}${encodeURIComponent(showKey(first))}${tail}" aria-label="${esc(first.title)}"></a>
    <div class="ticket-body">`)
    .replace(/<p class="ticket-hint">/, `<span class="date-chips" aria-label="${t("ticket.dates")}">${chips}</span><p class="ticket-hint">`);
}

// 날짜 칩을 누르면 펼침 효과가 그 날짜 상세로 이어지게 view-transition-name 을 옮긴다
export function bindGroupCards(root) {
  root.querySelectorAll(".ticket.is-group .date-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const card = chip.closest(".ticket");
      card.style.viewTransitionName = chip.dataset.vt;
    });
  });
}
