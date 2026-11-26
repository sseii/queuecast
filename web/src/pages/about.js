// 서비스 소개: 무엇을 하나 · 어떻게 예보하나 · 위험 단계 기준 · 공단·주최사 대응 · 데이터 출처
import { t } from "../i18n.js";
import { icon } from "../components/icons.js";
import { stopCountdown } from "../components/dayPlan.js";

export function renderAbout(app) {
  document.body.dataset.theme = "about";
  stopCountdown();
  document.title = `${t("about.title")} | ${t("brand")}`;

  const feature = (ic, h, p) => `
    <div class="feature"><span class="quick-ico">${icon[ic](24)}</span><h3>${h}</h3><p>${p}</p></div>`;
  const step = (n, h, items) => `
    <li class="flow-step"><span class="flow-num">${n}</span><h3>${h}</h3><ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul></li>`;
  const cat = (ic, h, p) => `
    <li><span class="cat-ico">${icon[ic](18)}</span><span><b>${h}</b><small>${p}</small></span></li>`;

  app.innerHTML = `
    <section class="page-head">
      <h1>${t("about.title")}</h1>
      <p>${t("about.lead")}</p>
    </section>

    <section class="about-sec" id="sec-what">
      <div class="feature-grid">
        ${feature("queue", t("about.f1"), t("about.f1.p"))}
        ${feature("medical", t("about.f2"), t("about.f2.p"))}
        ${feature("spark", t("about.f3"), t("about.f3.p"))}
      </div>
    </section>

    <section class="about-sec" id="sec-flow">
      <h2>${t("about.flow")}</h2>
      <ol class="flow">
        ${step(1, t("about.flow1"), [t("about.flow1.a"), t("about.flow1.b"), t("about.flow1.c")])}
        ${step(2, t("about.flow2"), [t("about.flow2.a"), t("about.flow2.b"), t("about.flow2.c")])}
        ${step(3, t("about.flow3"), [t("about.flow3.a"), t("about.flow3.b"), t("about.flow3.c")])}
      </ol>
      <p class="fine">${t("about.flow.when")}</p>
    </section>

    <section class="about-sec" id="sec-levels">
      <h2>${t("footer.levels")}</h2>
      <div class="table-scroll">
        <table class="level-table">
          <thead><tr><th>${t("th.level")}</th><th>${t("levels.summer")}</th><th>${t("levels.winter")}</th></tr></thead>
          <tbody>
            <tr><td><i class="dot lv-dot-safe"></i>${t("lv.safe")}</td><td>33℃ ${t("lt")}</td><td>−10℃ ${t("gt")}</td></tr>
            <tr><td><i class="dot lv-dot-caution"></i>${t("lv.caution")}</td><td>33℃ ${t("ge")}</td><td>−10℃ ${t("le")}</td></tr>
            <tr><td><i class="dot lv-dot-warning"></i>${t("lv.warning")}</td><td>35℃ ${t("ge")}</td><td>−25℃ ${t("le")}</td></tr>
            <tr><td><i class="dot lv-dot-danger"></i>${t("lv.danger")}</td><td>38℃ ${t("ge")}</td><td>—</td></tr>
          </tbody>
        </table>
      </div>
      <p class="fine">${t("levels.src")}</p>
    </section>

    <section class="about-sec" id="sec-guide">
      <h2>${t("guide.title")}</h2>
      <p>${t("about.guide.p")}</p>
      <ul class="cat-list">
        ${cat("umbrella", t("cat.shade"), t("about.cat.shade"))}
        ${cat("shelter", t("cat.indoor"), t("about.cat.indoor"))}
        ${cat("medical", t("cat.medical"), t("about.cat.medical"))}
        ${cat("queue", t("cat.queue"), t("about.cat.queue"))}
        ${cat("megaphone", t("cat.notice"), t("about.cat.notice"))}
      </ul>
      <a class="text-link" href="#/">${t("about.guide.go")}</a>
    </section>

    <section class="about-sec" id="sec-data">
      <h2>${t("footer.data")}</h2>
      <ul class="data-list">
        <li><b>${t("data.kma")}</b><small>${t("data.kma.p")}</small></li>
        <li><b>${t("data.kopis")}</b><small>${t("data.kopis.p")}</small></li>
        <li><b>${t("data.kspo")}</b><small>${t("data.kspo.p")}</small></li>
        <li><b>${t("data.photo")}</b><small>${t("data.photo.p")}</small></li>
      </ul>
      <p class="fine">${t("kopis")}</p>
    </section>
  `;
}
