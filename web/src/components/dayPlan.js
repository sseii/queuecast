// 공연 날을 기다리며: 카운트다운 · 그날의 타임라인 · 가방 챙기기 · 친구에게 보내기
import { esc, round, PACK, themeOf, genreOf, showTime, levelName, venueName } from "../util.js";
import { t, lang } from "../i18n.js";
import { icon } from "./icons.js";

// ── 카운트다운 ──
export function countdown(show, mode) {
  if (mode === "replay") {
    return `<div class="countdown is-past"><span>${t("cd.past")}</span></div>`;
  }
  const unit = (u) => `<span class="cd-num" data-unit="${u}">-</span><span class="cd-unit">${t(`cd.${u}`)}</span>`;
  return `
  <div class="countdown" data-countdown="${showTime(show).getTime()}">
    <span class="cd-label">${t("cd.until")}</span>${unit("d")}${unit("h")}${unit("m")}${unit("s")}
  </div>`;
}

let timer = null;
export function startCountdown(root) {
  clearInterval(timer);
  const box = root.querySelector("[data-countdown]");
  if (!box) return;
  const target = Number(box.dataset.countdown);
  const tick = () => {
    const left = Math.max(0, Math.floor((target - Date.now()) / 1000));
    if (left === 0) {
      box.innerHTML = `<span class="cd-label">${t("cd.now")}</span>`;
      clearInterval(timer);
      return;
    }
    const parts = { d: Math.floor(left / 86400), h: Math.floor((left % 86400) / 3600), m: Math.floor((left % 3600) / 60), s: left % 60 };
    for (const [k, v] of Object.entries(parts)) {
      const el = box.querySelector(`[data-unit="${k}"]`);
      if (el) el.textContent = k === "d" ? v : String(v).padStart(2, "0");
    }
  };
  tick();
  timer = setInterval(tick, 1000);
}
export function stopCountdown() {
  clearInterval(timer);
}

// ── 그날의 타임라인 ──
export function timeline(show) {
  const level = show.risk?.level ?? "safe";
  const events = [
    show.wait_window?.start && { t: show.wait_window.start, ic: "queue", title: t("tl.queue"), sub: t("tl.queue.sub") },
    show.parking_full_eta && { t: show.parking_full_eta, ic: "parking", title: t("tl.parking"), sub: t("tl.parking.sub") },
    show.risk?.peak_time && level !== "safe" && {
      t: show.risk.peak_time, ic: "thermo",
      title: t(show.season === "summer" ? "tl.hot" : "tl.cold"),
      sub: t("tl.risk.sub", { f: round(show.risk.peak_feel), l: levelName(level) }),
      cls: `is-risk lv-${level}`,
    },
    show.recommended_arrival && { t: show.recommended_arrival, ic: "walk", title: t("tl.arrive"), sub: t("tl.arrive.sub"), cls: "is-pick" },
    show.start_time && { t: show.start_time, ic: "spark", title: t("tl.show"), sub: esc(venueName(show.venue)), cls: "is-show" },
  ]
    .filter(Boolean)
    .sort((a, b) => a.t.localeCompare(b.t));

  return `
  <ol class="timeline">
    ${events
      .map(
        (e) => `
      <li class="${e.cls ?? ""}">
        <span class="tl-time">${esc(e.t)}</span>
        <span class="tl-dot">${icon[e.ic](16)}</span>
        <span class="tl-text"><b>${e.title}</b><small>${e.sub}</small></span>
      </li>`
      )
      .join("")}
  </ol>`;
}

// ── 가방 챙기기 (체크하면 이 브라우저에 저장) ──
export function packList(show) {
  const theme = themeOf(show);
  // 응원봉은 콘서트(대중음악)일 때만
  const extra = theme === "christmas" ? PACK.christmas : genreOf(show) === "concert" ? PACK.concert : PACK.stage;
  const items = [...(PACK[show.season] ?? []), ...extra];
  const saved = load(show.id);
  const done = items.filter((it) => saved.includes(it.id)).length;
  return `
  <div class="pack ${done === items.length ? "is-complete" : ""}" data-pack="${esc(show.id)}">
    <div class="pack-progress" data-done-label="${t("pack.done")}">
      <span class="pack-count">${t("pack.count", { d: done, n: items.length })}</span>
      <span class="pack-bar"><i style="width:${(done / items.length) * 100}%"></i></span>
    </div>
    <ul class="pack-list">
      ${items
        .map(
          (it) => `
        <li><label class="pack-item">
          <input type="checkbox" value="${it.id}" ${saved.includes(it.id) ? "checked" : ""} />
          <span class="pack-check">${icon.check(14)}</span>${it[lang()]}
        </label></li>`
        )
        .join("")}
    </ul>
  </div>`;
}

export function bindPack(root) {
  const box = root.querySelector("[data-pack]");
  if (!box) return;
  const id = box.dataset.pack;
  box.addEventListener("change", () => {
    const checked = [...box.querySelectorAll("input:checked")].map((i) => i.value);
    const total = box.querySelectorAll("input").length;
    box.querySelector("[data-pack-done]").textContent = checked.length;
    box.querySelector(".pack-bar i").style.width = `${(checked.length / total) * 100}%`;
    box.classList.toggle("is-complete", checked.length === total);
    try {
      localStorage.setItem(`qc-pack-${id}`, JSON.stringify(checked));
    } catch {}
  });
}

function load(id) {
  try {
    return JSON.parse(localStorage.getItem(`qc-pack-${id}`) ?? "[]");
  } catch {
    return [];
  }
}

// ── 친구에게 보내기 ──
export function shareButton() {
  return `<button type="button" class="share-btn" data-share>${icon.share(18)}<span>${t("share")}</span></button>`;
}

export function bindShare(root, show) {
  const btn = root.querySelector("[data-share]");
  if (!btn) return;
  const text = t("share.text", {
    title: show.title, date: show.date, time: show.start_time,
    feel: round(show.risk?.peak_feel), arr: show.recommended_arrival ?? "-",
  });
  btn.addEventListener("click", async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: show.title, text, url: location.href });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${location.href}`);
      btn.querySelector("span").textContent = t("share.copied");
    } catch {
      /* 공유 창을 닫은 경우 */
    }
  });
}
