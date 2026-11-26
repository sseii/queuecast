// 공연장 주변 편의시설 (#9) — 실내 쉼터·화장실·음수대·자판기, 종류별 가장 가까운 곳을 크게
// 실내 쉼터는 엔진이 facilities 에 type "실내 쉼터" 로 넣어 주면 나타난다
import { esc, venueName } from "../util.js";
import { t } from "../i18n.js";
import { icon } from "./icons.js";

const TYPES = [
  { key: "실내 쉼터", icon: icon.shelter(24), optional: true },
  { key: "화장실", icon: icon.restroom(24) },
  { key: "음수대", icon: icon.water(24) },
  { key: "자판기", icon: icon.cup(24) },
  { key: "간이편의점", icon: icon.store(24), optional: true },
];

export function fmtDist(m) {
  if (m == null) return "-";
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`;
}

export function mapUrl(f) {
  if (f.lat == null || f.lng == null) return null;
  return `https://map.kakao.com/link/map/${encodeURIComponent(`${f.type} ${f.place}`)},${f.lat},${f.lng}`;
}

export function nearest(show, type) {
  return (show.facilities ?? [])
    .filter((f) => f.type === type)
    .sort((a, b) => (a.distance_m ?? 1e9) - (b.distance_m ?? 1e9));
}

export function facilitiesCard(show) {
  const groups = TYPES.map((tp) => ({ ...tp, items: nearest(show, tp.key) })).filter((g) => !g.optional || g.items.length);

  const tile = (g) => {
    const [first, ...rest] = g.items;
    const name = t(`fac.${g.key}`);
    if (!first) {
      return `<div class="fac-tile is-empty"><span class="fac-icon" aria-hidden="true">${g.icon}</span>
        <span class="fac-name">${name}</span><span class="fine">${t("fac.none")}</span></div>`;
    }
    const url = mapUrl(first);
    const inner = `
      <span class="fac-icon" aria-hidden="true">${g.icon}</span>
      <span class="fac-name">${name}</span>
      <span class="fac-dist">${fmtDist(first.distance_m)}</span>
      <span class="fac-place">${esc(first.place)} ${esc(first.detail ?? "")}</span>
      ${rest.length ? `<span class="fine">${t("fac.more", { n: rest.length })}</span>` : ""}`;
    return url
      ? `<a class="fac-tile" href="${url}" target="_blank" rel="noopener">${inner}</a>`
      : `<div class="fac-tile">${inner}</div>`;
  };

  return `
  <section class="block">
    <h2>${t("fac.title")}</h2>
    <div class="fac-grid fac-${groups.length}">${groups.map(tile).join("")}</div>
    <p class="fine">${t("fac.note", { v: esc(venueName(show.venue)) })}</p>
  </section>`;
}
