// 공연 날을 기다리며: 카운트다운 · 그날의 타임라인 · 가방 챙기기 · 친구에게 보내기
import { esc, round, PACK, themeOf, showTime, LEVELS } from "../util.js";
import { icon } from "./icons.js";

// ── 카운트다운 ──
export function countdown(show, mode) {
  if (mode === "replay") {
    return `<div class="countdown is-past"><span>지난 공연을 다시 돌려 본 예보예요</span></div>`;
  }
  return `
  <div class="countdown" data-countdown="${showTime(show).getTime()}">
    <span class="cd-label">공연까지</span>
    <span class="cd-num" data-unit="d">-</span><span class="cd-unit">일</span>
    <span class="cd-num" data-unit="h">-</span><span class="cd-unit">시간</span>
    <span class="cd-num" data-unit="m">-</span><span class="cd-unit">분</span>
    <span class="cd-num" data-unit="s">-</span><span class="cd-unit">초</span>
  </div>`;
}

let timer = null;
export function startCountdown(root) {
  clearInterval(timer);
  const box = root.querySelector("[data-countdown]");
  if (!box) return;
  const target = Number(box.dataset.countdown);
  const tick = () => {
    let left = Math.max(0, Math.floor((target - Date.now()) / 1000));
    if (left === 0) {
      box.innerHTML = `<span class="cd-label">지금 공연 중이거나 끝났어요</span>`;
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
  const extreme = show.season === "summer" ? "가장 더운 시간" : "가장 추운 시간";
  const events = [
    show.wait_window?.start && { t: show.wait_window.start, ic: "queue", title: "야외 대기 시작", sub: "MD·입장 줄이 생기는 시간" },
    show.parking_full_eta && { t: show.parking_full_eta, ic: "parking", title: "주차장 만차 예상", sub: "이후엔 대중교통이 편해요" },
    show.risk?.peak_time && level !== "safe" && {
      t: show.risk.peak_time, ic: "thermo", title: extreme, sub: `체감 ${round(show.risk.peak_feel)}° · ${LEVELS[level].ko}`, cls: `is-risk lv-${level}`,
    },
    show.recommended_arrival && { t: show.recommended_arrival, ic: "walk", title: "이때 도착하면 딱 좋아요", sub: "추천 도착 시간", cls: "is-pick" },
    show.start_time && { t: show.start_time, ic: "spark", title: "공연 시작", sub: esc(show.venue), cls: "is-show" },
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
  const items = [...(PACK[show.season] ?? []), ...(PACK[theme] ?? [])];
  const saved = load(show.id);
  const done = items.filter((it) => saved.includes(it.id)).length;
  return `
  <div class="pack" data-pack="${esc(show.id)}">
    <div class="pack-progress">
      <span class="pack-count"><b data-pack-done>${done}</b> / ${items.length}개 챙겼어요</span>
      <span class="pack-bar"><i style="width:${(done / items.length) * 100}%"></i></span>
    </div>
    <ul class="pack-list">
      ${items
        .map(
          (it) => `
        <li><label class="pack-item">
          <input type="checkbox" value="${it.id}" ${saved.includes(it.id) ? "checked" : ""} />
          <span class="pack-check">${icon.check(14)}</span>${it.ko}
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
  const update = () => {
    const checked = [...box.querySelectorAll("input:checked")].map((i) => i.value);
    const total = box.querySelectorAll("input").length;
    box.querySelector("[data-pack-done]").textContent = checked.length;
    box.querySelector(".pack-bar i").style.width = `${(checked.length / total) * 100}%`;
    box.classList.toggle("is-complete", checked.length === total);
    try {
      localStorage.setItem(`qc-pack-${id}`, JSON.stringify(checked));
    } catch {}
  };
  box.addEventListener("change", update);
  box.classList.toggle("is-complete", box.querySelectorAll("input:checked").length === box.querySelectorAll("input").length);
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
  return `<button type="button" class="share-btn" data-share>${icon.share(18)}<span>같이 가는 친구에게 보내기</span></button>`;
}

export function bindShare(root, show) {
  const btn = root.querySelector("[data-share]");
  if (!btn) return;
  const text = `${show.title} (${show.date} ${show.start_time})\n줄 서는 시간 체감 ${round(show.risk?.peak_feel)}°, ${show.recommended_arrival ?? ""} 이후 도착 추천! 큐캐스트에서 준비물 확인해 봐`;
  btn.addEventListener("click", async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: show.title, text, url: location.href });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${location.href}`);
      btn.querySelector("span").textContent = "링크를 복사했어요";
    } catch {
      /* 공유 창을 닫은 경우 */
    }
  });
}
