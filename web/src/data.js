// 데이터 불러오기. 파일 형식은 docs/JSON_형식.md 기준.
// base 경로(/queuecast/)를 붙여야 GitHub Pages 에서도 동작한다.
const BASE = import.meta.env.BASE_URL;

const cache = {};

async function load(name) {
  if (name in cache) return cache[name];
  try {
    const res = await fetch(`${BASE}data/${name}`, { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    cache[name] = await res.json();
  } catch {
    cache[name] = null; // 파일이 아직 없으면 null (화면에서 "준비 중" 표시)
  }
  return cache[name];
}

// mode: "forecast" → forecast.json, "replay" → replay_2025.json
export function loadShows(mode) {
  return load(mode === "replay" ? "replay_2025.json" : "forecast.json");
}

export function loadActions() {
  return load("actions.json");
}
