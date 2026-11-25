// 기다리는 시간 동안 시간별 체감온도 (날씨 앱처럼 가로 막대)
import { esc, round, fmtFeel, LEVELS } from "../util.js";

export function hourlyStrip(show) {
  const rows = show.hourly ?? [];
  if (!rows.length) return `<p class="fine">시간별 예보가 아직 없어요.</p>`;

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
           aria-label="${esc(r.time)} 체감 ${r.feel}도 ${LEVELS[r.level]?.ko ?? ""}">
        <span class="strip-temp">${round(r.feel)}°</span>
        <span class="strip-bar-wrap"><span class="strip-bar lv-dot-${esc(r.level)}" style="height:${h(r.feel)}%"></span></span>
        <span class="strip-level lv-text-${esc(r.level)}">${LEVELS[r.level]?.ko ?? ""}</span>
        <span class="strip-time">${esc(r.time)}</span>
      </div>`;
      })
      .join("")}
  </div>
  <details class="more">
    <summary>자세한 수치 보기</summary>
    <div class="table-scroll">
      <table class="hourly-table">
        <thead><tr><th>시각</th><th>기온</th><th>습도</th><th>풍속</th><th>체감</th><th>단계</th></tr></thead>
        <tbody>
          ${rows
            .map(
              (r) => `<tr><td>${esc(r.time)}</td><td>${r.temp ?? "-"}℃</td><td>${r.humidity ?? "-"}%</td>
              <td>${r.wind ?? "-"}m/s</td><td><b>${fmtFeel(r.feel)}</b></td>
              <td><i class="dot lv-dot-${esc(r.level)}"></i>${LEVELS[r.level]?.ko ?? "-"}</td></tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>
  </details>`;
}
