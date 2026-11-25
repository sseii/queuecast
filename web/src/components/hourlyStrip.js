// 기다리는 시간 동안 시간별 체감온도 (날씨 앱처럼 세로 막대)
import { esc, round, fmtFeel, levelName } from "../util.js";
import { t } from "../i18n.js";

export function hourlyStrip(show) {
  const rows = show.hourly ?? [];
  if (!rows.length) return `<p class="fine">${t("strip.none")}</p>`;

  // 막대 높이: 여름은 더울수록, 겨울은 추울수록 높게
  const sign = show.season === "summer" ? 1 : -1;
  const vals = rows.map((r) => sign * (r.feel ?? 0));
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const h = (v) => (hi === lo ? 70 : 30 + ((sign * v - lo) / (hi - lo)) * 70);

  return `
  <div class="strip" role="list">
    ${rows
      .map((r) => {
        const peak = r.time === show.risk?.peak_time;
        return `
      <div class="strip-col ${peak ? "is-peak" : ""}" role="listitem"
           aria-label="${esc(r.time)} ${t("th.feel")} ${r.feel}° ${levelName(r.level)}">
        <span class="strip-temp">${round(r.feel)}°</span>
        <span class="strip-bar-wrap"><span class="strip-bar lv-dot-${esc(r.level)}" style="height:${h(r.feel)}%"></span></span>
        <span class="strip-level lv-text-${esc(r.level)}">${levelName(r.level)}</span>
        <span class="strip-time">${esc(r.time)}</span>
      </div>`;
      })
      .join("")}
  </div>
  <details class="more">
    <summary>${t("strip.more")}</summary>
    <div class="table-scroll">
      <table class="hourly-table">
        <thead><tr><th>${t("th.time")}</th><th>${t("th.temp")}</th><th>${t("th.hum")}</th><th>${t("th.wind")}</th><th>${t("th.feel")}</th><th>${t("th.level")}</th></tr></thead>
        <tbody>
          ${rows
            .map(
              (r) => `<tr><td>${esc(r.time)}</td><td>${r.temp ?? "-"}℃</td><td>${r.humidity ?? "-"}%</td>
              <td>${r.wind ?? "-"}m/s</td><td><b>${fmtFeel(r.feel)}</b></td>
              <td><i class="dot lv-dot-${esc(r.level)}"></i>${levelName(r.level) || "-"}</td></tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>
  </details>`;
}
