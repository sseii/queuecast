// 공연 목록 화면 (#7) — 기관 사이트 구성
//  ① 첫머리: 큰 제목 + 공연 찾기   ② 사진 띠 + 바로가기 아이콘   ③ 공연 티켓(관객용/공단·주최사용)
//  ④ 대기 타임라인(사진 띠)   ⑤ 공연장 안내
import { loadShows } from "../data.js";
import { groupShows, groupCard, bindGroupCards } from "../components/showCard.js";
import { LEVELS, esc, fmtGenerated, fmtBase, levelName, levelOf, scaleOf, dateParts, venueName } from "../util.js";
import { t } from "../i18n.js";
import { icon } from "../components/icons.js";
import { stopCountdown } from "../components/dayPlan.js";
import { HERO_PHOTO, QUEUE_PHOTO, photoImg } from "../photos.js";

const VENUES = [
  { key: "KSPO DOME", seats: 15000 },
  { key: "핸드볼경기장", seats: 6500 },
  { key: "올림픽홀", seats: 3000 },
  { key: "우리금융아트홀", seats: 1200 },
];

export async function renderList(app, mode, listView = "fan") {
  document.body.dataset.theme = "";
  stopCountdown();
  const data = await loadShows(mode);

  const shows = [...(data?.shows ?? [])].sort((a, b) =>
    `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`)
  );
  const counts = Object.keys(LEVELS)
    .map((lv) => ({ lv, n: shows.filter((s) => levelOf(s) === lv).length }))
    .filter((c) => c.n > 0);
  const groups = groupShows(shows); // 같은 공연 여러 날짜 → 카드 1장
  const used = new Set(); // 한 화면에 같은 사진이 두 번 나오지 않게
  const base = mode === "replay" ? "#/replay" : "#/";
  const opsHref = mode === "replay" ? "#/replay/ops" : "#/ops";

  app.innerHTML = `
    <section class="intro2">
      <span class="deco deco-dots" aria-hidden="true"></span>
      <span class="deco deco-lines" aria-hidden="true"></span>
      <div class="intro2-text">
        <h1>${t(`intro.title.${mode}`).replace("\n", "<br>")}</h1>
        <p class="intro2-sub">${t(`list.sub.${mode}`)}</p>
        ${data ? `<div class="intro-meta">${updatedLine(data)}${counts.map((c) => `<span class="count-pill"><i class="dot lv-dot-${c.lv}"></i>${levelName(c.lv)} ${c.n}</span>`).join("")}</div>` : ""}
      </div>
      <form class="search" role="search" data-search-form>
        <label class="sr-only" for="q">${t("search.label")}</label>
        <input id="q" type="search" placeholder="${t("search.ph")}" autocomplete="off" />
        <button type="submit" aria-label="${t("search.label")}">${icon.search(18)}</button>
      </form>
    </section>

    <section class="photo-band" aria-label="${t("quick.label")}">
      ${photoImg(HERO_PHOTO, 1800, "photo band-photo")}
      <nav class="band-tiles">
        ${tile("ticket", t("quick.shows"), base, "tickets")}
        ${tile("medical", t("quick.guide"), opsHref)}
        ${tile("thermo", t("quick.levels"), "#/about/levels")}
        ${tile("clock", t("quick.timeline"), base, "timeline")}
        ${tile("shelter", t("quick.venues"), base, "venues")}
        ${mode === "replay" ? tile("spark", t("quick.forecast"), "#/") : tile("queue", t("quick.replay"), "#/replay")}
      </nav>
      <span class="scroll-down" aria-hidden="true"><i></i>Scroll Down</span>
    </section>

    <section class="list-section" id="sec-tickets">
      <h2 class="center-title">${t(`list.head.${mode}`)}</h2>
      <nav class="view-switch list-switch" aria-label="${t("view.label")}">
        <a href="${base}" class="${listView === "fan" ? "active" : ""}">${icon.queue(18)}${t("view.list.fan")}</a>
        <a href="${opsHref}" class="${listView === "org" ? "active" : ""}">${icon.medical(18)}${t("view.list.org")}</a>
      </nav>
      ${listView === "org" && data ? briefing(shows) : `<p class="section-lead">${t(`list.lead.${mode}`)}</p>`}
      ${
        !data
          ? `<div class="empty"><p><b>${t(`list.loading.${mode}`)}</b></p>
              <p class="fine">${t("list.loading.sub", { f: mode === "replay" ? "replay_2025.json" : "forecast.json" })}</p></div>`
          : groups.length
            ? `<div class="ticket-grid">${groups
                .map((g) => `<div class="t-wrap" data-search="${esc(searchText(g))}">${groupCard(g, mode, listView, used)}</div>`)
                .join("")}</div>
               <p class="empty search-empty" hidden>${t("search.none")}</p>`
            : `<div class="empty"><p>${t("list.none")}</p></div>`
      }
    </section>

    ${data && shows.length ? timelineBand(shows, mode, listView) : ""}
    ${data ? venueSection(shows) : ""}
  `;

  bindGroupCards(app);
  bindSearch(app);
  app.querySelectorAll("[data-scroll]").forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById(`sec-${a.dataset.scroll}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    })
  );
}

function tile(ic, label, href, scroll) {
  return `<a class="band-tile" href="${href}" ${scroll ? `data-scroll="${scroll}"` : ""}>${icon[ic](30)}<span>${label}</span></a>`;
}

function searchText(group) {
  const s = group[0];
  return [s.title, s.venue, venueName(s.venue), s.genre].filter(Boolean).join(" ").toLowerCase();
}

// 공연 찾기: 공연명·공연장·장르로 카드 거르기
function bindSearch(root, initial = "") {
  const form = root.querySelector("[data-search-form]");
  const input = form?.querySelector("input");
  if (!input) return;
  const run = () => {
    const q = input.value.trim().toLowerCase();
    let shown = 0;
    root.querySelectorAll(".t-wrap").forEach((w) => {
      const hit = !q || w.dataset.search.includes(q);
      w.hidden = !hit;
      shown += hit;
    });
    const none = root.querySelector(".search-empty");
    if (none) none.hidden = shown > 0;
  };
  input.value = initial;
  input.addEventListener("input", run);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    run();
    document.getElementById("sec-tickets")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  root.querySelectorAll("[data-venue-filter]").forEach((b) =>
    b.addEventListener("click", () => {
      input.value = b.dataset.venueFilter;
      run();
      document.getElementById("sec-tickets")?.scrollIntoView({ behavior: "smooth", block: "start" });
    })
  );
}

// 대기 타임라인: 날짜마다 점 하나, 그날 공연과 대기 시작·단계
function timelineBand(shows, mode, listView) {
  const days = [...new Set(shows.map((s) => s.date))];
  const month = days[0] ? Number(days[0].slice(5, 7)) : null;
  const tail = listView === "org" ? "/org" : "";
  const href = (s) => `#/${mode === "replay" ? "replay" : "show"}/${encodeURIComponent(`${s.id}_${s.date}`)}${tail}`;
  return `
    <section class="timeline-band" id="sec-timeline">
      ${photoImg(QUEUE_PHOTO, 1800, "photo band-photo")}
      <div class="wrap tl-inner">
        <div class="tl-head">
          <p class="tl-kicker">${t("tl.band.kicker")}</p>
          <h2>${t("tl.band.title")}</h2>
        </div>
        ${month ? `<div class="tl-month"><small>${t("tl.band.this")}</small><b>${t("tl.band.month", { m: month })}</b></div>` : ""}
        <ol class="tl-days">
          ${days
            .map((d) => {
              const dp = dateParts(d);
              const list = shows.filter((s) => s.date === d);
              return `
            <li>
              <span class="tl-date"><b>${dp.md}</b> ${dp.wd}</span>
              <ul>
                ${list
                  .map(
                    (s) => `<li><a href="${href(s)}"><i class="dot lv-dot-${esc(levelOf(s))}"></i><span class="tl-show">${esc(s.title)}</span>
                      <small>${s.wait_window?.start ? t("ticket.wait", { a: esc(s.wait_window.start), b: esc(s.wait_window.end ?? "") }) : esc(s.start_time ?? "")}</small></a></li>`
                  )
                  .join("")}
              </ul>
            </li>`;
            })
            .join("")}
        </ol>
      </div>
    </section>`;
}

// 공연장 안내: 객석 수(대기 규모), 이번 예보 기간 공연 수·가장 높은 단계·만차 예상
function venueSection(shows) {
  return `
    <section class="venues" id="sec-venues">
      <h2 class="center-title">${t("venue.title")}</h2>
      <div class="venue-grid">
        ${VENUES.map((v) => {
          const list = shows.filter((s) => s.venue === v.key);
          const top = list.reduce((m, s) => ((LEVELS[levelOf(s)]?.rank ?? -1) > (LEVELS[m]?.rank ?? -2) ? levelOf(s) : m), null);
          const eta = list.map((s) => s.parking_full_eta).filter(Boolean).sort()[0];
          const sc = scaleOf({ expected_audience: v.seats });
          return `
          <article class="venue">
            <h3>${esc(venueName(v.key))}</h3>
            <p class="venue-seats">${t("venue.seats", { n: v.seats.toLocaleString("en-US") })} · ${t(`scale.${sc}`)}</p>
            <dl>
              <div><dt>${t("venue.shows")}</dt><dd>${list.length ? t("brief.n", { n: list.length }) : "—"}</dd></div>
              <div><dt>${t("venue.top")}</dt><dd>${top ? `<i class="dot lv-dot-${top}"></i>${levelName(top)}` : "—"}</dd></div>
              <div><dt>${t("brief.parking")}</dt><dd>${!list.length ? "—" : eta ?? t("venue.transit")}</dd></div>
            </dl>
            ${list.length ? `<button type="button" class="venue-btn" data-venue-filter="${esc(v.key.toLowerCase())}">${t("venue.go")}</button>` : `<p class="fine">${t("venue.none")}</p>`}
          </article>`;
        }).join("")}
      </div>
      <p class="fine center">${t("venue.note")}</p>
    </section>`;
}

// 운영 브리핑: 예보 기간 안 회차 기준으로 주의 이상·대규모·만차 예상을 한 줄로
function briefing(shows) {
  const rated = shows.filter((s) => levelOf(s) !== "pending");
  const risk = rated.filter((s) => LEVELS[levelOf(s)].rank >= 1).length;
  const large = shows.filter((s) => scaleOf(s) === "large").length;
  const pending = shows.length - rated.length;
  const earliest = (list) => list.map((s) => s.parking_full_eta).filter(Boolean).sort()[0];
  const wk = earliest(shows.filter((s) => s.day_type === "weekend"));
  const wd = earliest(shows.filter((s) => s.day_type !== "weekend"));
  const park = wk ? t("brief.park.wkend", { t: wk }) : wd ? t("brief.park.wkday", { t: wd }) : null;
  const tl = (label, value, hot) => `<div class="brief-tile ${hot ? "is-hot" : ""}"><span>${label}</span><b>${value}</b></div>`;
  return `
    <section class="briefing" aria-label="${t("brief.title")}">
      <div class="brief-head">
        <h3>${t("brief.title")}</h3>
        <p>${t("brief.line", { r: risk, l: large, p: park ? t("brief.park.line", { d: park }) : t("brief.park.none") })}</p>
      </div>
      <div class="brief-grid">
        ${tl(t("brief.shows"), t("brief.n", { n: shows.length }))}
        ${tl(t("brief.risk"), t("brief.n", { n: risk }), risk > 0)}
        ${tl(t("brief.large"), t("brief.n", { n: large }))}
        ${tl(t("brief.parking"), park ?? "—")}
      </div>
      <p class="fine">${pending ? `${t("brief.pending", { n: pending })} ` : ""}${t("brief.go")}</p>
    </section>`;
}

// 기준 시각: 예보 발표 시각(weather_base) 우선. stale 이면 강조해서 "최신 예보를 못 받았다"고 알림
export function updatedLine(data) {
  const b = fmtBase(data.weather_base);
  if (data.stale) {
    return `<span class="updated is-stale">${icon.clock(16)}${t("list.stale", { t: b ?? fmtGenerated(data.generated_at) })}</span>`;
  }
  const when = b ? t("list.base", { t: b }) : data.generated_at ? t("list.updated", { t: fmtGenerated(data.generated_at) }) : "";
  return when ? `<span class="updated">${when}</span>` : "";
}
