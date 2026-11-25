// 공통 상수·도우미 함수
import { t, lang } from "./i18n.js";

// 단계 코드 → 표시 정보 (docs/JSON_형식.md 단계 표 기준)
// pending: 아직 예보가 없음 (forecast_available false 또는 risk.level null) — 3일 전부터 예보가 나옴
export const LEVELS = {
  pending: { ko: "예보 전", en: "Not yet", rank: -1 },
  safe: { ko: "안전", en: "Safe", rank: 0 },
  caution: { ko: "주의", en: "Caution", rank: 1 },
  warning: { ko: "경고", en: "Warning", rank: 2 },
  danger: { ko: "위험", en: "Danger", rank: 3 },
};

export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

export function fmtFeel(n) {
  return n == null ? "-" : `${Number(n).toFixed(1)}℃`;
}

const WEEK_KO = ["일", "월", "화", "수", "목", "금", "토"];
const WEEK_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MON_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ISO 시각 → "11월 24일 05:30" / "Nov 24, 05:30"
export function fmtGenerated(iso) {
  if (!iso) return "-";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return iso;
  return lang() === "en"
    ? `${MON_EN[Number(m[2]) - 1]} ${Number(m[3])}, ${m[4]}:${m[5]}`
    : `${Number(m[2])}월 ${Number(m[3])}일 ${m[4]}:${m[5]}`;
}

// 공연장 영문 이름 (영어 화면용)
const VENUES_EN = {
  "KSPO DOME": "KSPO DOME",
  올림픽홀: "Olympic Hall",
  핸드볼경기장: "Handball Arena",
  우리금융아트홀: "Woori Financial Art Hall",
  기타: "Olympic Park",
};
export function venueName(v) {
  return lang() === "en" ? VENUES_EN[v] ?? v : v;
}

export function levelName(level) {
  return LEVELS[level]?.[lang()] ?? "";
}

// 예상 관객 수 15000 → "15,000"
export function fmtPeople(n) {
  return n == null ? null : Number(n).toLocaleString("en-US");
}

// actions.json 문구의 {peak_feel} 등을 forecast 값으로 바꾼다.
// 값이 null 이면: 괄호 안에 있으면 괄호째 지우고, 아니면 "정보 없음"/"N/A".
export function fillTemplate(text, show, l = lang()) {
  const values = {
    peak_feel: show.risk?.peak_feel != null ? Number(show.risk.peak_feel).toFixed(1) : null,
    recommended_arrival: show.recommended_arrival,
    parking_full_eta: show.parking_full_eta,
  };
  let out = esc(text);
  for (const [key, val] of Object.entries(values)) {
    const ph = `{${key}}`;
    if (!out.includes(ph)) continue;
    if (val == null) {
      out = out.replace(new RegExp(`\\s*\\([^()]*\\{${key}\\}[^()]*\\)`, "g"), "");
      out = out.split(ph).join(l === "en" ? "N/A" : "정보 없음");
    } else {
      out = out.split(ph).join(esc(val));
    }
  }
  return out;
}

// 친근한 상태 말투 ("추워요" 등). 문구는 i18n.js 의 mood.*
export function levelOf(show) {
  return show.forecast_available === false || !show.risk?.level ? "pending" : show.risk.level;
}

export function mood(show, level = levelOf(show)) {
  if (level === "pending") return t("mood.pending");
  const season = show.season === "summer" ? "summer" : "winter";
  const lv = season === "winter" && level === "danger" ? "warning" : level;
  return t(`mood.${season}.${lv}`);
}

// 가방 챙기기: 날씨 준비물(actions.json 관객 안내 문구와 같게) + 공연 분위기별 설렘 준비물
export const PACK = {
  summer: [
    { id: "water", ko: "물", en: "Water" },
    { id: "parasol", ko: "양산", en: "Parasol" },
    { id: "hat", ko: "모자", en: "Hat" },
  ],
  winter: [
    { id: "gloves", ko: "장갑", en: "Gloves" },
    { id: "scarf", ko: "목도리", en: "Scarf" },
    { id: "warmer", ko: "핫팩", en: "Hand warmers" },
  ],
  concert: [
    { id: "stick", ko: "응원봉", en: "Light stick" },
    { id: "battery", ko: "보조배터리", en: "Power bank" },
    { id: "ticket", ko: "티켓·신분증", en: "Ticket & ID" },
  ],
  stage: [
    { id: "battery", ko: "보조배터리", en: "Power bank" },
    { id: "ticket", ko: "티켓·신분증", en: "Ticket & ID" },
  ],
  christmas: [
    { id: "redgreen", ko: "빨강·초록 포인트 아이템", en: "Something red or green" },
    { id: "battery", ko: "보조배터리", en: "Power bank" },
    { id: "ticket", ko: "티켓·신분증", en: "Ticket & ID" },
  ],
};

// "2026-12-20" → { md: "12.20", wd: "일" }
export function dateParts(ymd, l = lang()) {
  if (!ymd) return { md: "-", wd: "" };
  const [y, m, d] = ymd.split("-").map(Number);
  const w = new Date(y, m - 1, d).getDay();
  return { md: `${m}.${d}`, wd: (l === "en" ? WEEK_EN : WEEK_KO)[w] };
}

export function round(n) {
  if (n == null) return "–";
  const r = Math.round(Number(n));
  return r < 0 ? `−${-r}` : String(r); // 진짜 마이너스 기호(−)가 숫자와 더 잘 붙어 보임
}

// 공연 분위기(테마). forecast.json 에 theme 필드가 있으면 그걸 쓰고,
// 없으면 공연명으로 추정한다. (엔진에서 KOPIS 장르를 넘겨주면 더 정확해짐)
export const THEMES = { concert: true, christmas: true }; // 이름·인사말은 i18n.js 의 theme.* / greet.*

const XMAS = /크리스마스|성탄|홀리데이|캐롤|캐럴|산타|연말|파티|christmas|xmas|holiday|carol|party/i;

// KOPIS 장르(genrenm) → 화면 표시용 장르 키. 대중음악이거나 장르가 없으면 "concert"
const GENRES = [
  ["뮤지컬", "musical"], ["연극", "play"], ["클래식", "classical"], ["국악", "korean"],
  ["무용", "dance"], ["서커스", "circus"], ["마술", "circus"], ["복합", "mixed"], ["대중음악", "concert"],
];
export function genreOf(show) {
  const g = show.genre ?? "";
  return GENRES.find(([word]) => g.includes(word))?.[1] ?? "concert";
}

export function themeOf(show) {
  if (show.theme && THEMES[show.theme]) return show.theme;
  return XMAS.test(show.title ?? "") ? "christmas" : "concert";
}

// 같은 공연은 항상 같은 그림이 나오도록 id 로 난수 고정
export function seeded(key) {
  let h = 1779033703;
  for (const c of String(key)) h = Math.imul(h ^ c.charCodeAt(0), 3432918353);
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// 같은 공연이 여러 날 하면 KOPIS id 가 같으므로, 공연 하나(회차 날짜)를 가리키는 키는 id + 날짜
export function showKey(show) {
  return show.date ? `${show.id}_${show.date}` : String(show.id);
}

export function vtName(id) {
  return "t-" + String(id).replace(/[^a-zA-Z0-9_-]/g, "_");
}

// 공연까지 남은 시간 (한국시간 기준)
export function showTime(show) {
  return new Date(`${show.date}T${show.start_time || "00:00"}:00+09:00`);
}

export function dday(show, now = Date.now()) {
  const today = new Date(now + 9 * 3600e3).toISOString().slice(0, 10);
  const diff = Math.round((Date.parse(show.date) - Date.parse(today)) / 86400e3);
  if (Number.isNaN(diff) || diff < 0) return null;
  return diff === 0 ? "D-DAY" : `D-${diff}`;
}
