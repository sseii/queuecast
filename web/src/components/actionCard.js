// 관객 안내(한·영)와 공단·주최사 대응 체크리스트 (#8)
import { fillTemplate } from "../util.js";

function entry(actions, show) {
  return actions?.[show.season]?.[show.risk?.level] ?? null;
}

export function audienceCard(actions, show) {
  const level = show.risk?.level ?? "safe";
  const e = entry(actions, show);
  const safe = level === "safe" || !e;
  // 해외 관객이 많은 공연은 영어 안내를 먼저 보여준다
  const order = show.foreign_audience ? ["en", "ko"] : ["ko", "en"];
  const tabLabel = { ko: "한국어", en: "English" };

  const body = (lang) => {
    if (safe) {
      return `<p class="notice-text">${lang === "en" ? "No special notice. Enjoy the show!" : "특별히 조심할 건 없어요. 즐거운 관람 되세요!"}</p>`;
    }
    return `
      <p class="notice-text">${fillTemplate(e.audience[lang], show, lang)}</p>
      <button type="button" class="text-btn" data-copy="${lang}">${lang === "en" ? "Copy message" : "안내 문구 복사"}</button>`;
  };

  return `
  <section class="block audience" data-tabs>
    <div class="block-head">
      <h2>${show.foreign_audience ? "Notice for fans" : "관객 안내"}</h2>
      <div class="seg" role="tablist" aria-label="언어">
        ${order
          .map((lang, i) => `<button type="button" role="tab" data-lang="${lang}" aria-selected="${i === 0}">${tabLabel[lang]}</button>`)
          .join("")}
      </div>
    </div>
    ${order
      .map((lang, i) => `<div class="lang-body" data-lang-body="${lang}" lang="${lang}" ${i === 0 ? "" : "hidden"}>${body(lang)}</div>`)
      .join("")}
  </section>`;
}

export function orgCard(actions, show) {
  const level = show.risk?.level ?? "safe";
  const e = entry(actions, show);
  if (level === "safe" || !e) {
    return `
    <section class="block org">
      <h2>공단·주최사 대응</h2>
      <p class="fine">이 공연은 따로 준비할 조치가 없어요.</p>
    </section>`;
  }
  return `
  <details class="block org" open>
    <summary><h2>공단·주최사 대응 체크리스트</h2><span class="org-count">${e.org.length}개</span></summary>
    <ul class="checklist">
      ${e.org
        .map((t, i) => `<li><input type="checkbox" id="org-${i}" /><label for="org-${i}">${fillTemplate(t, show)}</label></li>`)
        .join("")}
    </ul>
    <p class="fine">현장 점검용 체크예요. 새로고침하면 지워져요.</p>
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
        const lang = btn.dataset.copy;
        const text = box.querySelector(`[data-lang-body="${lang}"] .notice-text`).textContent;
        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = lang === "en" ? "Copied" : "복사했어요";
        } catch {
          btn.textContent = lang === "en" ? "Couldn't copy" : "복사하지 못했어요";
        }
      });
    });
  });
}
