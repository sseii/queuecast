// 큐캐스트 웹 — 화면 전환 (hash 라우팅)
//   #/              다가오는 공연 목록 (forecast.json)
//   #/show/<id>     공연 화면
//   #/replay        2025 사례 목록 (replay_2025.json)
//   #/replay/<id>   2025 사례 공연 화면
// 티켓을 누르면 View Transitions API 로 티켓이 공연 화면 맨 위 큰 티켓으로 커진다.
// (지원하지 않는 브라우저는 그냥 화면만 바뀜)
import "./style.css";
import { renderList } from "./pages/list.js";
import { renderDetail } from "./pages/detail.js";
import { loadShows, loadActions } from "./data.js";

const app = document.getElementById("app");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function parse() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const mode = parts[0] === "replay" ? "replay" : "forecast";
  const id = parts[0] === "replay" || parts[0] === "show" ? parts[1] : null;
  return { mode, id: id ? decodeURIComponent(id) : null };
}

async function render() {
  const { mode, id } = parse();
  document.querySelectorAll(".mode-tabs a").forEach((a) => a.classList.toggle("active", a.dataset.mode === mode));
  document.title = "큐캐스트 QueueCast";
  if (id) await renderDetail(app, mode, id);
  else await renderList(app, mode);
}

async function route() {
  const { mode } = parse();
  // 데이터를 먼저 받아 두면 전환 중에 빈 화면이 보이지 않는다
  await Promise.all([loadShows(mode), loadActions()]);
  if (document.startViewTransition && !reduceMotion && app.childElementCount) {
    document.startViewTransition(async () => {
      await render();
      window.scrollTo(0, 0);
    });
  } else {
    await render();
    window.scrollTo(0, 0);
  }
}

window.addEventListener("hashchange", route);
route();
