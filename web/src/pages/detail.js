// 공연 화면: 티켓이 펼쳐진 모습. 공연 분위기(콘서트/크리스마스)에 따라 사진·색이 바뀐다
//  ① 사진 콜라주 티켓  ② 카운트다운  ③ 그날의 타임라인  ④ 가방 챙기기
//  ⑤ 기다리는 동안 체감온도  ⑥ 관객 안내(한·영, 실내 쉼터)  ⑦ 편의시설
//  ⑧ 공단·주최사 체크리스트(관객 규모 추가 조치)  ⑨ 다른 공연
import { loadShows, loadActions } from "../data.js";
import { hourlyStrip } from "../components/hourlyStrip.js";
import { audienceCard, bindAudience } from "../components/actionCard.js";
import { orgGuide, bindGuide } from "../components/orgGuide.js";
import { facilitiesCard } from "../components/facilities.js";
import { showCard } from "../components/showCard.js";
import { art } from "../components/art.js";
import { icon } from "../components/icons.js";
import { countdown, startCountdown, stopCountdown, timeline, packList, bindPack, shareButton, bindShare } from "../components/dayPlan.js";
import { photosFor, photoImg } from "../photos.js";
import { esc, dateParts, mood, round, fmtGenerated, levelName, venueName, themeOf, vtName, levelOf, showKey } from "../util.js";
import { themeChips } from "../components/chips.js";
import { t, lang } from "../i18n.js";
import { updatedLine } from "./list.js";

export async function renderDetail(app, mode, id, view = "fan") {
  const [data, actions] = await Promise.all([loadShows(mode), loadActions()]);
  const show = data?.shows?.find((s) => showKey(s) === id) ?? data?.shows?.find((s) => s.id === id);
  const back = mode === "replay" ? "#/replay" : "#/";
  const base = `#/${mode === "replay" ? "replay" : "show"}/${encodeURIComponent(id)}`; // 주소에 쓴 키 그대로

  if (!show) {
    document.body.dataset.theme = "";
    app.innerHTML = `<div class="empty"><p>${t("notfound")}</p><a class="back" href="${back}">${t("back")}</a></div>`;
    return;
  }

  const level = levelOf(show);
  const theme = themeOf(show);
  document.body.dataset.theme = theme;
  const d = dateParts(show.date);
  const [p1, p2, p3] = photosFor(show, 3);
  const others = (data.shows ?? [])
    .filter((s) => showKey(s) !== showKey(show))
    .sort((a, b) => `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`));

  app.innerHTML = `
    <a class="back" href="${back}">${t("back")}</a>

    <section class="hero theme-${theme}" style="view-transition-name:${vtName(showKey(show))}">
      <div class="hero-main">
        <div class="collage">
          <div class="cell cell-main">
            ${art(theme, show.id, 700, 380, { animate: true })}
            ${photoImg(p1, 1400)}
            <div class="hero-text">
              <div class="ticket-top">
                ${themeChips(show, theme)}
                ${show.foreign_audience ? `<span class="theme-chip">${t("hero.foreign")}</span>` : ""}
              </div>
              <h1>${esc(show.title)}</h1>
              <p class="ticket-when"><b>${d.md}</b> ${d.wd} ${esc(show.start_time)}<span class="sep"></span>${esc(venueName(show.venue))}
</p>
            </div>
          </div>
          <div class="cell">${art(theme, show.id + "b", 300, 190)}${photoImg(p2, 600)}</div>
          <div class="cell">${art(theme, show.id + "c", 300, 190)}${photoImg(p3, 600)}</div>
        </div>
      </div>
      <div class="hero-stub lv-stub-${esc(level)}">
        <span class="stub-label">${t("hero.feel")}</span>
        <span class="hero-temp">${round(show.risk?.peak_feel)}${show.risk?.peak_feel == null ? "" : "°"}</span>
        ${level === "pending" ? "" : `<span class="hero-mood">${mood(show, level)}</span>`}
        <span class="stub-level">${level === "pending" ? t("ticket.hint.pending") : t("hero.level", { l: levelName(level) })}</span>
      </div>
    </section>

    <nav class="view-switch" aria-label="화면">
      <a href="${base}" class="${view === "fan" ? "active" : ""}">${icon.queue(18)}${t("view.fan")}</a>
      <a href="${base}/org" class="${view === "org" ? "active" : ""}">${icon.medical(18)}${t("view.org")}</a>
    </nav>

    ${
      view === "fan" && show.foreign_audience && lang() === "ko"
        ? `<button type="button" class="lang-hint" data-set-lang="en">${icon.spark(16)} This show has many international fans. View in English</button>`
        : ""
    }

    <div class="unfold">
      ${view === "org" ? orgView(actions, show) : fanView(actions, show, mode, base)}

      ${
        others.length
          ? `<section class="others">
              <h2>${t("others")}</h2>
              <div class="others-row">${others.map((s) => showCard(s, mode, { mini: true, view })).join("")}</div>
            </section>`
          : ""
      }

      <p class="fine updated-foot">${updatedLine(data)}</p>
    </div>
  `;

  if (view === "org") {
    stopCountdown();
    bindGuide(app, actions, show);
  } else {
    bindAudience(app);
    bindPack(app);
    bindShare(app, show);
    startCountdown(app);
  }
  document.title = `${show.title} | ${lang() === "en" ? "QueueCast" : "큐캐스트"}`;
}

// 관객용: 카운트다운·타임라인·가방·체감온도·안내·편의시설 + 대응 가이드로 가는 입구
function fanView(actions, show, mode, base) {
  const theme = themeOf(show);
  return `
      <section class="excite">
        ${countdown(show, mode)}
        ${shareButton()}
      </section>
      <div class="plan-grid">
        <section class="block">
          <h2>${t("plan.title")}</h2>
          ${timeline(show)}
        </section>
        <section class="block">
          <h2>${t("pack.title")}</h2>
          ${packList(show)}
          <p class="fine">${t(`greet.${theme}`)}</p>
        </section>
      </div>
      <section class="block">
        <div class="block-head"><h2>${t("strip.title")}</h2></div>
        ${levelOf(show) === "pending" ? `<p class="fine">${t("strip.pending")}</p>` : hourlyStrip(show)}
      </section>
      ${audienceCard(actions, show)}
      ${facilitiesCard(show)}
      <a class="guide-cta" href="${base}/org">
        <span class="cat-ico">${icon.medical(22)}</span>
        <span><b>${t("guide.cta")}</b><small>${t("guide.cta.sub")}</small></span>
        <span class="arrow" aria-hidden="true">›</span>
      </a>`;
}

// 공단·주최사용: 시간별 위험 → 단계별 대응 가이드 → 편의시설 위치
function orgView(actions, show) {
  return `
      <section class="block">
        <div class="block-head"><h2>${t("strip.title")}</h2></div>
        ${levelOf(show) === "pending" ? `<p class="fine">${t("strip.pending")}</p>` : hourlyStrip(show)}
      </section>
      ${orgGuide(actions, show)}
      ${facilitiesCard(show)}`;
}
