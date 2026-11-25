// 공연 화면: 티켓이 펼쳐진 모습. 공연 분위기(콘서트/크리스마스)에 따라 사진·색이 바뀐다
//  ① 사진 콜라주 티켓  ② 카운트다운  ③ 그날의 타임라인  ④ 가방 챙기기
//  ⑤ 기다리는 동안 체감온도  ⑥ 관객 안내(한·영)  ⑦ 편의시설  ⑧ 공단·주최사 체크리스트  ⑨ 다른 공연
import { loadShows, loadActions } from "../data.js";
import { hourlyStrip } from "../components/hourlyStrip.js";
import { audienceCard, orgCard, bindAudience } from "../components/actionCard.js";
import { facilitiesCard } from "../components/facilities.js";
import { showCard } from "../components/showCard.js";
import { art } from "../components/art.js";
import { countdown, startCountdown, timeline, packList, bindPack, shareButton, bindShare } from "../components/dayPlan.js";
import { photosFor, photoImg } from "../photos.js";
import { esc, dateParts, mood, round, fmtGenerated, LEVELS, THEMES, themeOf, vtName } from "../util.js";

export async function renderDetail(app, mode, id) {
  const [data, actions] = await Promise.all([loadShows(mode), loadActions()]);
  const show = data?.shows?.find((s) => s.id === id);
  const back = mode === "replay" ? "#/replay" : "#/";

  if (!show) {
    document.body.dataset.theme = "";
    app.innerHTML = `<div class="empty"><p>공연을 찾지 못했어요.</p><a class="back" href="${back}">공연 목록으로</a></div>`;
    return;
  }

  const level = show.risk?.level ?? "safe";
  const theme = themeOf(show);
  document.body.dataset.theme = theme;
  const m = mood(show, level);
  const d = dateParts(show.date);
  const [p1, p2, p3] = photosFor(theme, show.id, 3);
  const others = (data.shows ?? [])
    .filter((s) => s.id !== show.id)
    .sort((a, b) => `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`));

  app.innerHTML = `
    <a class="back" href="${back}">공연 목록</a>

    <section class="hero theme-${theme}" style="view-transition-name:${vtName(show.id)}">
      <div class="hero-main">
        <div class="collage">
          <div class="cell cell-main">
            ${art(theme, show.id, 700, 380, { animate: true })}
            ${photoImg(p1, 1400)}
            <div class="hero-text">
              <span class="theme-chip">${THEMES[theme].ko}</span>
              <h1>${esc(show.title)}</h1>
              <p class="ticket-when"><b>${d.md}</b> ${d.wd} ${esc(show.start_time)}<span class="sep"></span>${esc(show.venue)}</p>
            </div>
          </div>
          <div class="cell">${art(theme, show.id + "b", 300, 190)}${photoImg(p2, 600)}</div>
          <div class="cell">${art(theme, show.id + "c", 300, 190)}${photoImg(p3, 600)}</div>
        </div>
      </div>
      <div class="hero-stub lv-stub-${esc(level)}">
        <span class="stub-label">줄 서는 동안 체감</span>
        <span class="hero-temp">${round(show.risk?.peak_feel)}°</span>
        <span class="hero-mood">${m.ko}</span>
        <span class="stub-level">${LEVELS[level]?.ko ?? ""} 단계</span>
      </div>
    </section>

    <div class="unfold">
      <section class="excite">
        ${countdown(show, mode)}
        ${shareButton()}
      </section>

      <div class="plan-grid">
        <section class="block">
          <h2>그날의 타임라인</h2>
          ${timeline(show)}
        </section>
        <section class="block">
          <h2>가방 챙기기</h2>
          ${packList(show)}
          <p class="fine">${THEMES[theme].greet}</p>
        </section>
      </div>

      <section class="block">
        <div class="block-head">
          <h2>기다리는 동안 체감온도</h2>
        </div>
        ${hourlyStrip(show)}
      </section>

      ${audienceCard(actions, show)}
      ${facilitiesCard(show)}
      ${orgCard(actions, show)}

      ${
        others.length
          ? `<section class="others">
              <h2>다른 공연 티켓</h2>
              <div class="others-row">${others.map((s) => showCard(s, mode, { mini: true })).join("")}</div>
            </section>`
          : ""
      }

      <p class="fine updated-foot">${fmtGenerated(data.generated_at)} 기준 ${mode === "replay" ? "재현" : "예보"} · 사진 Pexels</p>
    </div>
  `;

  bindAudience(app);
  bindPack(app);
  bindShare(app, show);
  startCountdown(app);
  document.title = `${show.title} | 큐캐스트`;
}
