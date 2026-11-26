// 티켓 위 작은 꼬리표: 장르(KOPIS) + 크리스마스 분위기
import { genreOf, scaleOf } from "../util.js";
import { t } from "../i18n.js";

export function themeChips(show, theme) {
  const chips = [];
  if (theme === "christmas") chips.push(t("theme.christmas"));
  chips.push(t(`genre.${genreOf(show)}`));
  const html = chips.map((c) => `<span class="theme-chip">${c}</span>`);
  const sc = scaleOf(show);
  if (sc) html.push(`<span class="theme-chip scale-chip scale-${sc}">${t(`scale.${sc}`)}</span>`);
  if (show.data_status === "partial") html.push(`<span class="theme-chip partial-chip">${t("partial")}</span>`);
  return html.join("");
}
