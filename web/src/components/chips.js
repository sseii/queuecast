// 티켓 위 작은 꼬리표: 장르(KOPIS) + 크리스마스 분위기
import { genreOf } from "../util.js";
import { t } from "../i18n.js";

export function themeChips(show, theme) {
  const chips = [];
  if (theme === "christmas") chips.push(t("theme.christmas"));
  chips.push(t(`genre.${genreOf(show)}`));
  return chips.map((c) => `<span class="theme-chip">${c}</span>`).join("");
}
