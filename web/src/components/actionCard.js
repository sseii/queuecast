// 관객 안내(한·영)와 공단·주최사 대응 체크리스트 (#8)
//  - 관객 안내: actions.json [계절][단계].audience + 가장 가까운 실내 쉼터
//  - 공단·주최사 대응은 orgGuide.js
import { esc, fillTemplate, scaleOf, levelOf } from "../util.js";
import { t, lang } from "../i18n.js";
import { nearest, fmtDist, mapUrl } from "./facilities.js";
import { icon } from "./icons.js";

function entry(actions, show) {
  return actions?.[show.season]?.[show.risk?.level] ?? null;
}

export function audienceCard(actions, show) {
  const level = levelOf(show);
  const e = entry(actions, show);
  const pending = level === "pending";
  const safe = !pending && (level === "safe" || !e);
  // 영어 화면이거나 해외 팬이 많은 공연이면 영어 안내를 먼저
  const order = lang() === "en" || show.foreign_audience ? ["en", "ko"] : ["ko", "en"];
  const tabLabel = { ko: "한국어", en: "English" };
  const [shelter] = nearest(show, "실내 쉼터");

  const body = (l) => `
      <p class="notice-text">${pending ? t("aud.pending", {}, l) : safe ? t("aud.safe", {}, l) : fillTemplate(e.audience[l], show, l)}</p>
      ${!safe && !pending && shelter ? shelterBox(shelter, show, l) : ""}
      ${safe || pending ? "" : `<button type="button" class="text-btn" data-copy="${l}">${t("aud.copy", {}, l)}</button>`}`;

  return `
  <section class="block audience" data-tabs>
    <div class="block-head">
      <h2>${t("aud.title")}</h2>
      <div class="seg" role="tablist">
        ${order
          .map((l, i) => `<button type="button" role="tab" data-lang="${l}" aria-selected="${i === 0}">${tabLabel[l]}</button>`)
          .join("")}
      </div>
    </div>
    ${order
      .map((l, i) => `<div class="lang-body" data-lang-body="${l}" lang="${l}" ${i === 0 ? "" : "hidden"}>${body(l)}</div>`)
      .join("")}
  </section>`;
}

function shelterBox(f, show, l) {
  const url = mapUrl(f);
  const go = t(show.season === "summer" ? "aud.shelter.go.summer" : "aud.shelter.go", {}, l);
  const inner = `
    <span class="shelter-icon">${icon.shelter(22)}</span>
    <span class="shelter-text"><small>${t("aud.shelter", {}, l)} · ${fmtDist(f.distance_m)}</small>
      <b>${esc(f.place)} ${esc(f.detail ?? "")}</b><small>${go}</small></span>`;
  return url
    ? `<a class="shelter" href="${url}" target="_blank" rel="noopener">${inner}</a>`
    : `<div class="shelter">${inner}</div>`;
}

// 대기 규모 추가 조치: actions.json scale 의 medium·large. 대(large)면 중+대 조치를 모두, 중이면 중만, 소는 없음
export function scaleTier(actions, show) {
  const sc = scaleOf(show);
  if (!actions?.scale || !sc || sc === "small") return null;
  const keys = sc === "large" ? ["medium", "large"] : ["medium"];
  const org = keys.flatMap((k) => actions.scale[k]?.org ?? []);
  return org.length ? { org } : null;
}


// 언어 탭·복사 버튼 동작 연결
export function bindAudience(root) {
  root.querySelectorAll("[data-tabs]").forEach((box) => {
    box.querySelectorAll("[data-lang]").forEach((btn) => {
      btn.addEventListener("click", () => {
        box.querySelectorAll("[data-lang]").forEach((b) => b.setAttribute("aria-selected", b === btn));
        box.querySelectorAll("[data-lang-body]").forEach((b) => {
          b.hidden = b.dataset.langBody !== btn.dataset.lang;
        });
      });
    });
    box.querySelectorAll("[data-copy]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const l = btn.dataset.copy;
        const text = box.querySelector(`[data-lang-body="${l}"] .notice-text`).textContent;
        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = t("aud.copied", {}, l);
        } catch {
          btn.textContent = t("aud.copyfail", {}, l);
        }
      });
    });
  });
}
