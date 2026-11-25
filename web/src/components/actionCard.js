// 관객 안내(한·영)와 공단·주최사 대응 체크리스트 (#8)
//  - 관객 안내: actions.json [계절][단계].audience + 가장 가까운 실내 쉼터
//  - 대응 체크리스트: actions.json [계절][단계].org + 관객 규모 추가 조치(actions.json scale)
import { esc, fillTemplate, fmtPeople } from "../util.js";
import { t, lang } from "../i18n.js";
import { nearest, fmtDist, mapUrl } from "./facilities.js";
import { icon } from "./icons.js";

function entry(actions, show) {
  return actions?.[show.season]?.[show.risk?.level] ?? null;
}

export function audienceCard(actions, show) {
  const level = show.risk?.level ?? "safe";
  const e = entry(actions, show);
  const safe = level === "safe" || !e;
  // 영어 화면이거나 해외 팬이 많은 공연이면 영어 안내를 먼저
  const order = lang() === "en" || show.foreign_audience ? ["en", "ko"] : ["ko", "en"];
  const tabLabel = { ko: "한국어", en: "English" };
  const [shelter] = nearest(show, "실내 쉼터");

  const body = (l) => `
      <p class="notice-text">${safe ? t("aud.safe", {}, l) : fillTemplate(e.audience[l], show, l)}</p>
      ${!safe && shelter ? shelterBox(shelter, show, l) : ""}
      ${safe ? "" : `<button type="button" class="text-btn" data-copy="${l}">${t("aud.copy", {}, l)}</button>`}`;

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

// 관객 규모 구간: actions.json 의 scale 중 min 이하인 것 가운데 가장 큰 구간
export function scaleTier(actions, show) {
  const n = show.expected_audience;
  if (n == null || !actions?.scale) return null;
  return Object.values(actions.scale)
    .filter((s) => n >= s.min_audience)
    .sort((a, b) => b.min_audience - a.min_audience)[0] ?? null;
}

export function orgCard(actions, show) {
  const level = show.risk?.level ?? "safe";
  const e = entry(actions, show);
  const tier = level === "safe" ? null : scaleTier(actions, show);
  const base = level === "safe" || !e ? [] : e.org;

  if (!base.length) {
    return `
    <section class="block org">
      <h2>${t("org.title")}</h2>
      <p class="fine">${t("org.none")}</p>
    </section>`;
  }
  const list = (items, prefix) =>
    items
      .map((txt, i) => `<li><input type="checkbox" id="${prefix}-${i}" /><label for="${prefix}-${i}">${fillTemplate(txt, show, "ko")}</label></li>`)
      .join("");

  return `
  <details class="block org" open>
    <summary><h2>${t("org.title")}</h2><span class="org-count">${t("org.count", { n: base.length + (tier?.org.length ?? 0) })}</span></summary>
    ${lang() === "en" ? `<p class="fine">${t("org.ko")}</p>` : ""}
    <ul class="checklist">${list(base, "org")}</ul>
    ${
      tier
        ? `<div class="scale">
            <h3>${t("org.scale")}</h3>
            <p class="fine">${t("org.scale.sub", { n: fmtPeople(show.expected_audience), s: esc(tier.label) })}</p>
            <ul class="checklist">${list(tier.org, "scale")}</ul>
          </div>`
        : ""
    }
    <p class="fine">${t("org.note")}</p>
  </details>`;
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
