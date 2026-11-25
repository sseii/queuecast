// 공연 분위기 그림 (SVG). 사진 없이 코드로 그려서 저작권 걱정 없음
//  concert   : 밤 무대, 조명, 응원봉 불빛, 관객 실루엣
//  christmas : 전구 줄, 눈, 트리, 별
import { seeded } from "../util.js";

export function art(theme, key, w = 400, h = 240, { animate = false } = {}) {
  const rnd = seeded(key + theme);
  const id = `a${Math.floor(rnd() * 1e9)}`;
  const body = theme === "christmas" ? christmas(rnd, id, w, h) : concert(rnd, id, w, h);
  return `<svg class="art ${animate ? "is-animated" : ""}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${body}</svg>`;
}

function concert(rnd, id, w, h) {
  const stick = ["#ff5fd2", "#5ee7ff", "#fff36b", "#a98bff", "#ff8a5c"];
  const beams = [0.18, 0.42, 0.66, 0.88]
    .map((x, i) => {
      const cx = w * x;
      const spread = w * (0.12 + rnd() * 0.1);
      const tilt = (rnd() - 0.5) * w * 0.25;
      return `<polygon class="beam beam-${i % 2}" points="${cx - 6},-5 ${cx + 6},-5 ${cx + tilt + spread},${h} ${cx + tilt - spread},${h}"
        fill="url(#${id}b)" opacity="${0.35 + rnd() * 0.25}" style="transform-origin:${cx}px 0px" />`;
    })
    .join("");
  const crowdY = h * 0.8;
  let crowd = `M0 ${h} L0 ${crowdY}`;
  for (let x = 0; x <= w + 20; x += 14 + rnd() * 10) {
    const top = crowdY - 6 - rnd() * 14;
    crowd += ` Q${x + 6} ${top - 10} ${x + 12} ${top + 4}`;
  }
  crowd += ` L${w} ${h} Z`;
  const glows = Array.from({ length: Math.round(w / 14) }, () => {
    const x = rnd() * w;
    const y = crowdY - 22 - rnd() * h * 0.18;
    const c = stick[Math.floor(rnd() * stick.length)];
    return `<circle class="glow" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(2 + rnd() * 2.5).toFixed(1)}" fill="${c}"
      style="animation-delay:${(rnd() * 2).toFixed(2)}s" />
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="${c}" opacity=".18" />`;
  }).join("");
  const sparks = Array.from({ length: 22 }, () =>
    `<circle cx="${(rnd() * w).toFixed(1)}" cy="${(rnd() * h * 0.55).toFixed(1)}" r="${(0.6 + rnd()).toFixed(1)}" fill="#fff" opacity="${(0.3 + rnd() * 0.5).toFixed(2)}" />`
  ).join("");
  return `
    <defs>
      <linearGradient id="${id}g" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" stop-color="#2a1263" /><stop offset=".55" stop-color="#4b1f9e" /><stop offset="1" stop-color="#d6409f" />
      </linearGradient>
      <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity=".9" /><stop offset="1" stop-color="#fff" stop-opacity="0" />
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#${id}g)" />
    ${sparks}${beams}${glows}
    <path d="${crowd}" fill="#150a33" />`;
}

function christmas(rnd, id, w, h) {
  const colors = ["#ff4d4d", "#ffd34d", "#5ce1a0", "#ff9ad5", "#7fd3ff"];
  // 전구 줄 두 가닥
  const strands = [0.16, 0.34].map((yy, s) => {
    const y0 = h * yy, sag = h * (0.12 + rnd() * 0.06);
    const pt = (t) => {
      const x = t * w;
      const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * (y0 + sag * 2) + t * t * (y0 - h * 0.04);
      return [x, y];
    };
    const n = Math.round(w / 30);
    const bulbs = Array.from({ length: n }, (_, i) => {
      const [x, y] = pt((i + 0.5) / n);
      const c = colors[(i + s) % colors.length];
      return `<circle cx="${x.toFixed(1)}" cy="${(y + 5).toFixed(1)}" r="10" fill="${c}" opacity=".22" />
        <ellipse class="bulb" cx="${x.toFixed(1)}" cy="${(y + 5).toFixed(1)}" rx="3.2" ry="4.4" fill="${c}"
          style="animation-delay:${((i % 4) * 0.4).toFixed(1)}s" />`;
    }).join("");
    const [x1, y1] = pt(0), [x2, y2] = pt(1);
    return `<path d="M${x1} ${y1} Q${w / 2} ${y0 + sag * 2} ${x2} ${y2}" stroke="#0b2a1f" stroke-width="1.5" fill="none" />${bulbs}`;
  }).join("");
  // 트리 (오른쪽)
  const tx = w * 0.8, base = h * 0.98, th = h * 0.6;
  const tree = [0, 1, 2]
    .map((i) => {
      const top = base - th + i * th * 0.22;
      const half = th * (0.22 + i * 0.1);
      const bot = top + th * 0.42;
      return `<polygon points="${tx},${top} ${tx + half},${bot} ${tx - half},${bot}" fill="${["#2f9d63", "#26875a", "#1f7650"][i]}" />`;
    })
    .join("");
  const ornaments = Array.from({ length: 9 }, () => {
    const t = rnd();
    const y = base - th * 0.75 + t * th * 0.68;
    const spread = th * (0.08 + t * 0.32);
    const x = tx + (rnd() - 0.5) * spread * 1.6;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(2.5 + rnd() * 1.5).toFixed(1)}" fill="${colors[Math.floor(rnd() * colors.length)]}" />`;
  }).join("");
  const star = `<polygon points="${starPts(tx, base - th - 4, 10, 4.5)}" fill="#ffd34d" />
    <circle cx="${tx}" cy="${base - th - 4}" r="18" fill="#ffd34d" opacity=".2" />`;
  const snow = Array.from({ length: Math.round(w / 6) }, () => {
    const r = 0.8 + rnd() * 2.2;
    return `<circle class="flake" cx="${(rnd() * w).toFixed(1)}" cy="${(rnd() * h).toFixed(1)}" r="${r.toFixed(1)}" fill="#fff"
      opacity="${(0.4 + rnd() * 0.5).toFixed(2)}" style="animation-duration:${(5 + rnd() * 6).toFixed(1)}s;animation-delay:-${(rnd() * 8).toFixed(1)}s" />`;
  }).join("");
  return `
    <defs>
      <linearGradient id="${id}g" x1="0" y1="0" x2=".3" y2="1">
        <stop offset="0" stop-color="#0d3b2c" /><stop offset=".6" stop-color="#14523c" /><stop offset="1" stop-color="#7a1c2a" />
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#${id}g)" />
    <ellipse cx="${w / 2}" cy="${h + 10}" rx="${w * 0.7}" ry="${h * 0.12}" fill="#fff" opacity=".28" />
    ${tree}${ornaments}${star}${strands}${snow}`;
}

function starPts(cx, cy, R, r) {
  return Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 ? r : R;
    return `${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}
