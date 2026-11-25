// 공단·주최사용 단계별 대응 가이드
//  - 단계 사다리: 안전 → 주의 → 경고 → (위험). 오늘 예보 단계가 기본, 다른 단계도 눌러서 미리 볼 수 있음
//  - 분야별 조치: 그늘·급수(겨울은 바람막이·보온) / 실내 대기 공간 / 의료 인력 / 입장·줄 운영 / 관객 안내
//  - 조치마다 언제 할지: 공연 데이터(대기 시작·가장 위험한 시간·공연 시작)로 실제 시각을 계산
//  문구: actions.json [계절][단계].org_detail (없으면 .org 목록을 그대로 보여줌)
import { esc, fillTemplate, fmtPeople, levelName, LEVELS } from "../util.js";
import { t, lang } from "../i18n.js";
import { icon } from "./icons.js";
import { scaleTier } from "./actionCard.js";

const CATS = ["shade", "indoor", "medical", "queue", "notice"];
const CAT_ICON = { shade: "umbrella", indoor: "shelter", medical: "medical", queue: "queue", notice: "megaphone" };

export function levelsFor(show) {
  return show.season === "summer" ? ["safe", "caution", "warning", "danger"] : ["safe", "caution", "warning"];
}

function addMin(hhmm, m) {
  if (!hhmm) return null;
  const [h, mm] = hhmm.split(":").map(Number);
  const tot = Math.max(0, Math.min(24 * 60 - 1, h * 60 + mm + m));
  return `${String(Math.floor(tot / 60)).padStart(2, "0")}:${String(tot % 60).padStart(2, "0")}`;
}

// 조치 시점 토큰 → 이 공연의 실제 시각
export function whenLabel(token, show) {
  const w = show.wait_window?.start, s = show.start_time, p = show.risk?.peak_time;
  switch (token) {
    case "now": return t("when.now");
    case "before_wait": return w ? t("when.before", { t: w }) : t("when.now");
    case "wait": return w && s ? t("when.during", { a: w, b: s }) : "";
    case "peak": return p ? t("when.peak", { a: addMin(p, -30), b: addMin(p, 30) }) : t("when.during", { a: w, b: s });
    case "after_show": return t("when.after");
    default: return "";
  }
}

// 그 단계 이상인 시간대 (예: 15:00~18:00)
function hoursAtOrAbove(show, level) {
  const r = LEVELS[level]?.rank ?? 0;
  const hrs = (show.hourly ?? []).filter((h) => (LEVELS[h.level]?.rank ?? 0) >= r).map((h) => h.time);
  if (!hrs.length) return null;
  return hrs.length === 1 ? hrs[0] : `${hrs[0]}~${hrs[hrs.length - 1]}`;
}

function guideBody(actions, show, level) {
  const today = show.risk?.level ?? "safe";
  const rankSel = LEVELS[level].rank, rankToday = LEVELS[today].rank;
  const hrs = level === "safe" ? null : hoursAtOrAbove(show, level);
  const status =
    level === today
      ? hrs ? t("guide.today.hrs", { l: levelName(level), h: hrs }) : t("guide.today", { l: levelName(level) })
      : rankSel > rankToday
        ? t("guide.preview.up", { l: levelName(level) })
        : t("guide.preview.down", { l: levelName(level) });

  if (level === "safe") {
    return `<p class="guide-status">${status}</p><p class="guide-safe">${t("org.none")}</p>`;
  }
  const e = actions?.[show.season]?.[level];
  if (!e) return `<p class="guide-status">${status}</p>`;

  const saved = load(show.id, level);
  const detail = e.org_detail ?? e.org.map((text) => ({ cat: "queue", when: "", text }));
  const groups = CATS.map((c) => ({ c, items: detail.map((d, i) => ({ ...d, i })).filter((d) => d.cat === c) })).filter((g) => g.items.length);
  const cat = (c) => t(c === "shade" && show.season !== "summer" ? "cat.warm" : `cat.${c}`);

  return `
    <p class="guide-status">${status}</p>
    <p class="guide-sum">${t("guide.sum", { a: groups.length, n: detail.length })}</p>
    ${lang() === "en" ? `<p class="fine">${t("org.ko")}</p>` : ""}
    <div class="guide-grid">
      ${groups
        .map(
          (g) => `
        <section class="guide-cat cat-${g.c}">
          <h3><span class="cat-ico">${icon[g.c === "shade" && show.season !== "summer" ? "wind" : CAT_ICON[g.c]](18)}</span>${cat(g.c)}</h3>
          <ul>
            ${g.items
              .map(
                (d) => `
              <li><label>
                <input type="checkbox" data-org-item="${d.i}" ${saved.includes(d.i) ? "checked" : ""} />
                <span class="g-text">${fillTemplate(d.text, show, "ko")}</span>
                ${d.when ? `<span class="g-when">${esc(whenLabel(d.when, show))}</span>` : ""}
              </label></li>`
              )
              .join("")}
          </ul>
        </section>`
        )
        .join("")}
    </div>`;
}

export function orgGuide(actions, show) {
  const today = show.risk?.level ?? "safe";
  const levels = levelsFor(show);
  const tier = scaleTier(actions, show);
  return `
  <section class="block guide" data-guide>
    <div class="block-head">
      <h2>${t("guide.title")}</h2>
      ${show.expected_audience != null ? `<span class="peak-note">${t("hero.people", { n: fmtPeople(show.expected_audience) })}</span>` : ""}
    </div>
    <div class="ladder" role="tablist" aria-label="${t("guide.ladder")}">
      ${levels
        .map(
          (lv) => `
        <button type="button" role="tab" class="rung lv-rung-${lv}" data-org-level="${lv}" aria-selected="${lv === today}">
          <span class="rung-name">${levelName(lv)}</span>
          ${lv === today ? `<span class="rung-today">${t("guide.forecast")}</span>` : ""}
        </button>`
        )
        .join("")}
    </div>
    <div class="guide-body" data-guide-body>${guideBody(actions, show, today)}</div>
    ${
      tier && today !== "safe"
        ? `<div class="scale">
            <h3>${t("org.scale")}</h3>
            <p class="fine">${t("org.scale.sub", { n: fmtPeople(show.expected_audience), s: esc(tier.label) })}</p>
            <ul class="checklist">${tier.org
              .map((txt, i) => `<li><input type="checkbox" id="scale-${i}" /><label for="scale-${i}">${fillTemplate(txt, show, "ko")}</label></li>`)
              .join("")}</ul>
          </div>`
        : ""
    }
    <p class="fine">${t("guide.note")}</p>
  </section>`;
}

export function bindGuide(root, actions, show) {
  const box = root.querySelector("[data-guide]");
  if (!box) return;
  let current = show.risk?.level ?? "safe";
  box.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-org-level]");
    if (!btn) return;
    current = btn.dataset.orgLevel;
    box.querySelectorAll("[data-org-level]").forEach((b) => b.setAttribute("aria-selected", b === btn));
    box.querySelector("[data-guide-body]").innerHTML = guideBody(actions, show, current);
  });
  box.addEventListener("change", (e) => {
    if (!e.target.matches("[data-org-item]")) return;
    const checked = [...box.querySelectorAll("[data-org-item]:checked")].map((i) => Number(i.dataset.orgItem));
    try {
      localStorage.setItem(`qc-org-${show.id}-${current}`, JSON.stringify(checked));
    } catch {}
  });
}

function load(id, level) {
  try {
    return JSON.parse(localStorage.getItem(`qc-org-${id}-${level}`) ?? "[]");
  } catch {
    return [];
  }
}
