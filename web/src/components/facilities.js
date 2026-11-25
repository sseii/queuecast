// 공연장 주변 편의시설 (#9) — 음수대·화장실·자판기, 종류별 가장 가까운 곳을 크게
import { esc } from "../util.js";
import { icon } from "./icons.js";

const TYPES = [
  { key: "화장실", icon: icon.restroom(24) },
  { key: "음수대", icon: icon.water(24) },
  { key: "자판기", icon: icon.cup(24) },
];

function fmtDist(m) {
  if (m == null) return "-";
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`;
}

function mapUrl(f) {
  if (f.lat == null || f.lng == null) return null;
  return `https://map.kakao.com/link/map/${encodeURIComponent(`${f.type} ${f.place}`)},${f.lat},${f.lng}`;
}

export function facilitiesCard(show) {
  const list = show.facilities ?? [];
  const groups = TYPES.map((t) => ({
    ...t,
    items: list.filter((f) => f.type === t.key).sort((a, b) => (a.distance_m ?? 1e9) - (b.distance_m ?? 1e9)),
  }));

  const tile = (g) => {
    const [first, ...rest] = g.items;
    if (!first) {
      return `<div class="fac-tile is-empty"><span class="fac-icon" aria-hidden="true">${g.icon}</span>
        <span class="fac-name">${g.key}</span><span class="fine">근처에 없어요</span></div>`;
    }
    const url = mapUrl(first);
    const inner = `
      <span class="fac-icon" aria-hidden="true">${g.icon}</span>
      <span class="fac-name">${g.key}</span>
      <span class="fac-dist">${fmtDist(first.distance_m)}</span>
      <span class="fac-place">${esc(first.place)} ${esc(first.detail ?? "")}</span>
      ${rest.length ? `<span class="fine">외 ${rest.length}곳</span>` : ""}`;
    return url
      ? `<a class="fac-tile" href="${url}" target="_blank" rel="noopener" title="카카오맵에서 보기">${inner}</a>`
      : `<div class="fac-tile">${inner}</div>`;
  };

  return `
  <section class="block">
    <h2>가까운 편의시설</h2>
    <div class="fac-grid">${groups.map(tile).join("")}</div>
    <p class="fine">${esc(show.venue)}에서 직선거리예요. 누르면 지도가 열려요.</p>
  </section>`;
}
