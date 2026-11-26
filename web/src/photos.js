// 공연 분위기 사진 (Pexels, 무료·상업적 이용 가능, 출처 표기 의무 없음 — https://www.pexels.com/license/)
// 사진은 Pexels 서버에서 바로 불러온다. 못 불러오면 그 자리에 코드로 그린 그림(art.js)이 보인다.
// 장르별 묶음에서 고르고, 목록 한 화면에서는 같은 사진이 두 번 나오지 않게 한다.
// 사진을 바꾸려면 아래 경로만 바꾸면 된다 (images.pexels.com/photos/ 뒤 부분).
import { seeded, genreOf, themeOf } from "./util.js";

export const PHOTOS = {
  concert: [
    "2167381/pexels-photo-2167381.jpeg", // 응원봉 든 아레나 관객
    "39105749/pexels-photo-39105749/free-photo-of-vibrant-night-concert-crowd-with-glowing-lights.jpeg",
    "30215324/pexels-photo-30215324/free-photo-of-vibrant-indoor-concert-with-dynamic-lights.jpeg",
    "36570979/pexels-photo-36570979/free-photo-of-black-and-white-concert-audience-in-arena.jpeg",
    "4218027/pexels-photo-4218027.jpeg",
    "38780318/pexels-photo-38780318/free-photo-of-electrifying-night-concert-with-stage-lights.jpeg",
    "36675302/pexels-photo-36675302/free-photo-of-vibrant-concert-crowd-under-dramatic-stage-lights.jpeg",
    "39005265/pexels-photo-39005265/free-photo-of-dynamic-concert-scene-with-crowd-and-stage-lights.jpeg",
    "1179581/pexels-photo-1179581.jpeg",
    "32399568/pexels-photo-32399568/free-photo-of-energetic-night-concert-with-vibrant-crowd.jpeg",
    "34622947/pexels-photo-34622947/free-photo-of-energetic-concert-audience-with-raised-hands.jpeg",
  ],
  stage: [ // 뮤지컬·연극·국악·복합
    "713149/pexels-photo-713149.jpeg",
    "12092846/pexels-photo-12092846.jpeg",
    "17757320/pexels-photo-17757320/free-photo-of-instruments-on-a-stage-in-an-opera-house.jpeg",
  ],
  classical: [
    "7763042/pexels-photo-7763042.jpeg",
    "27926553/pexels-photo-27926553/free-photo-of-the-inside-of-a-large-auditorium-with-a-piano.jpeg",
    "17757320/pexels-photo-17757320/free-photo-of-instruments-on-a-stage-in-an-opera-house.jpeg",
  ],
  circus: [ // 서커스·마술
    "20797888/pexels-photo-20797888/free-photo-of-woman-throwing-cards-on-stage.jpeg",
    "11634143/pexels-photo-11634143.jpeg",
    "20797899/pexels-photo-20797899/free-photo-of-woman-illusionist-throwing-cards.jpeg",
    "12963701/pexels-photo-12963701.jpeg",
  ],
  dance: [
    "4250534/pexels-photo-4250534.jpeg",
    "17083536/pexels-photo-17083536/free-photo-of-ballerina-in-tutu-dress-dancing-on-stage.jpeg",
    "35233104/pexels-photo-35233104/free-photo-of-dynamic-ballet-dancer-amidst-colorful-smoke.jpeg",
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

// 첫 화면 사진 띠, 대기 타임라인 띠 배경.
// KSPO DOME 공식 사진 등으로 바꾸려면 사용 허락(공공누리 등)을 확인한 뒤
// 파일을 web/public/images/ 에 넣고 아래 대신 그 경로를 쓰면 된다
export const HERO_PHOTO = PHOTOS.concert[0];
export const QUEUE_PHOTO = "1002776/pexels-photo-1002776.jpeg"; // 겨울, 밖에서 줄 선 사람들

const GENRE_POOL = { concert: "concert", musical: "stage", play: "stage", korean: "stage", mixed: "stage", classical: "classical", circus: "circus", dance: "dance" };

function poolFor(show) {
  if (themeOf(show) === "christmas") return PHOTOS.christmas;
  return PHOTOS[GENRE_POOL[genreOf(show)] ?? "concert"];
}

// 공연마다 고정된 순서로 섞은 사진 목록 (같은 공연은 늘 같은 순서)
function orderFor(show) {
  const list = [...poolFor(show)];
  const rnd = seeded("photo" + show.id);
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// 공연 화면 콜라주용 n장
export function photosFor(show, n = 3) {
  const list = orderFor(show);
  return Array.from({ length: n }, (_, i) => list[i % list.length]);
}

// 목록용 1장: used 에 이미 쓴 사진은 건너뛴다 (묶음이 모자라면 겹칠 수 있음)
export function pickPhoto(show, used) {
  const list = orderFor(show);
  const p = list.find((x) => !used?.has(x)) ?? list[0];
  used?.add(p);
  return p;
}

export function photoUrl(path, w = 800) {
  return `https://images.pexels.com/photos/${path}?auto=compress&cs=tinysrgb&w=${w}`;
}

// 사진 태그. 실패하면 스스로 지워져서 뒤의 그림이 보인다
export function photoImg(path, w, cls = "photo") {
  return `<img class="${cls}" src="${photoUrl(path, w)}" alt="" loading="lazy" decoding="async"
    onload="this.classList.add('is-loaded')" onerror="this.remove()" />`;
}
