// 공연 분위기 사진 (Pexels, 무료·상업적 이용 가능, 출처 표기 의무 없음 — https://www.pexels.com/license/)
// 사진은 Pexels 서버에서 바로 불러온다. 못 불러오면 그 자리에 코드로 그린 그림(art.js)이 보인다.
// 사진을 바꾸고 싶으면 아래 목록의 경로만 바꾸면 된다 (images.pexels.com/photos/ 뒤 부분).
import { seeded } from "./util.js";

export const PHOTOS = {
  concert: [
    "38780318/pexels-photo-38780318/free-photo-of-electrifying-night-concert-with-stage-lights.jpeg",
    "34622947/pexels-photo-34622947/free-photo-of-energetic-concert-audience-with-raised-hands.jpeg",
    "36675302/pexels-photo-36675302/free-photo-of-vibrant-concert-crowd-under-dramatic-stage-lights.jpeg",
    "5193526/pexels-photo-5193526.jpeg",
    "39005265/pexels-photo-39005265/free-photo-of-dynamic-concert-scene-with-crowd-and-stage-lights.jpeg",
    "1179581/pexels-photo-1179581.jpeg",
    "32399568/pexels-photo-32399568/free-photo-of-energetic-night-concert-with-vibrant-crowd.jpeg",
  ],
  christmas: [
    "19969554/pexels-photo-19969554/free-photo-of-christmas-trees-at-night.jpeg",
    "35169339/pexels-photo-35169339/free-photo-of-illuminated-christmas-tree-with-star-in-night-sky.jpeg",
    "834894/pexels-photo-834894.jpeg",
    "30165854/pexels-photo-30165854/free-photo-of-vibrant-red-christmas-ornaments-hanging-decor.jpeg",
    "6211045/pexels-photo-6211045.jpeg",
    "15005978/pexels-photo-15005978/free-photo-of-angel-shaped-street-decorations-in-city-at-night.jpeg",
    "752484/pexels-photo-752484.jpeg",
    "14930215/pexels-photo-14930215.jpeg",
  ],
};

// 첫 화면 배경 사진. KSPO DOME 공식 사진 등으로 바꾸려면 사용 허락(공공누리 등)을 확인한 뒤
// 파일을 web/public/images/ 에 넣고 HERO_PHOTO 대신 그 경로를 쓰면 된다
export const HERO_PHOTO = PHOTOS.concert[0];

export function photoUrl(path, w = 800) {
  return `https://images.pexels.com/photos/${path}?auto=compress&cs=tinysrgb&w=${w}`;
}

// 공연마다 사진 n장을 고정으로 고른다 (같은 공연은 항상 같은 사진)
export function photosFor(theme, key, n = 3) {
  const list = [...(PHOTOS[theme] ?? PHOTOS.concert)];
  const rnd = seeded("photo" + key);
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list.slice(0, n);
}

// 사진 태그. 실패하면 스스로 지워져서 뒤의 그림이 보인다
export function photoImg(path, w, cls = "photo") {
  return `<img class="${cls}" src="${photoUrl(path, w)}" alt="" loading="lazy" decoding="async"
    onload="this.classList.add('is-loaded')" onerror="this.remove()" />`;
}
