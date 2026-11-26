// 큐캐스트 웹 — 화면 전환 (hash 라우팅)
//   #/              다가오는 공연 목록 (forecast.json)
//   #/show/<id>     공연 화면
//   #/replay        2025 사례 목록 (replay_2025.json)
//   #/replay/<id>   2025 사례 공연 화면
//   …/<id>/org      같은 공연의 공단·주최사용 화면 (단계별 대응 가이드)
//   #/about[/섹션]  서비스 소개 (levels·guide·data 로 바로 이동)
// 티켓을 누르면 View Transitions API 로 티켓이 공연 화면 맨 위 큰 티켓으로 커진다.
// (지원하지 않는 브라우저는 그냥 화면만 바뀜)
import "./style.css";
import { renderList } from "./pages/list.js";
import { renderDetail } from "./pages/detail.js";
import { renderAbout } from "./pages/about.js";
import { loadShows, loadActions } from "./data.js";
import { t, lang, setLang } from "./i18n.js";

const app = document.getElementById("app");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function parse() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const mode = parts[0] === "replay" ? "replay" : "forecast";
  const id = parts[0] === "replay" || parts[0] === "show" ? parts[1] : null;
  const view = parts[2] === "org" ? "org" : "fan";
  if (parts[0] === "about") return { page: "about", mode: "forecast", section: parts[1] ?? null };
  return { page: id ? "detail" : "list", mode, id: id ? decodeURIComponent(id) : null, view };
}

// 머리·꼬리 글자 (언어 바뀔 때마다)
function renderChrome({ page, mode }) {
  document.documentElement.lang = lang();
  document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  const current = page === "about" ? "about" : mode;
  document.querySelectorAll(".main-nav [data-nav]").forEach((a) => {
    a.classList.toggle("active", a.dataset.nav === current);
    if (a.dataset.nav === current) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  document.querySelector("[data-lang-toggle]").textContent = t("nav.lang");
  document.querySelector(".skip-link").textContent = t("skip");
  closeMenu();
  document.getElementById("credit").textContent = t("footer");
  document.getElementById("sources").textContent = t("kopis"); // KOPIS 이용 규정 문구 그대로
  document.title = lang() === "en" ? "QueueCast" : "큐캐스트 QueueCast";
}

async function render() {
  const r = parse();
  renderChrome(r);
  if (r.page === "about") renderAbout(app, r.section);
  else if (r.page === "detail") await renderDetail(app, r.mode, r.id, r.view);
  else await renderList(app, r.mode);
}

async function route({ keepScroll = false } = {}) {
  const { mode } = parse();
  // 데이터를 먼저 받아 두면 전환 중에 빈 화면이 보이지 않는다
  await Promise.all([loadShows(mode), loadActions()]);
  const y = window.scrollY;
  const { section } = parse();
  const done = () => {
    const target = section && document.getElementById(`sec-${section}`);
    if (target) target.scrollIntoView({ block: "start" });
    else window.scrollTo(0, keepScroll ? y : 0);
  };
  if (document.startViewTransition && !reduceMotion && app.childElementCount) {
    document.startViewTransition(async () => {
      await render();
      done();
    });
  } else {
    await render();
    done();
  }
}

// 언어 바꾸기: 오른쪽 위 버튼, 또는 화면 안의 "View in English" 버튼
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-lang-toggle], [data-set-lang]");
  if (!btn) return;
  setLang(btn.dataset.setLang ?? (lang() === "en" ? "ko" : "en"));
  route({ keepScroll: true });
});

// 휴대폰 메뉴
const menuBtn = document.querySelector(".menu-btn");
function closeMenu() {
  document.body.classList.remove("menu-open");
  menuBtn?.setAttribute("aria-expanded", "false");
}
menuBtn?.addEventListener("click", () => {
  const open = !document.body.classList.contains("menu-open");
  document.body.classList.toggle("menu-open", open);
  menuBtn.setAttribute("aria-expanded", String(open));
  menuBtn.setAttribute("aria-label", t(open ? "menu.close" : "menu.open"));
});

// 맨 위로 버튼: 조금 내려가면 나타남
const toTop = document.querySelector("[data-to-top]");
toTop?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }));
window.addEventListener("scroll", () => toTop?.classList.toggle("is-shown", window.scrollY > 600), { passive: true });

window.addEventListener("hashchange", () => route());
route();
