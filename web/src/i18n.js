// 화면 문구 한·영. 언어는 오른쪽 위 버튼으로 바꾸고, 이 브라우저에 기억한다.
// 문구를 고칠 때는 여기서 ko/en 을 같이 고친다. (대응 조치·관객 안내 문장은 actions.json)

let current = "ko";
try {
  current = localStorage.getItem("qc-lang") === "en" ? "en" : "ko";
} catch {}

export const lang = () => current;
export function setLang(l) {
  current = l === "en" ? "en" : "ko";
  document.documentElement.lang = current;
  try {
    localStorage.setItem("qc-lang", current);
  } catch {}
}

const T = {
  // 머리·꼬리
  "nav.forecast": { ko: "다가오는 공연", en: "Upcoming" },
  "nav.replay": { ko: "2025 사례", en: "2025 cases" },
  "nav.lang": { ko: "English", en: "한국어" },
  "footer": { ko: "2026 한국체육산업개발 공공데이터 활용 경진대회 출품작, 팀 33도", en: "Entry for the 2026 KSPO Public Data Contest, Team 33°" },

  // 목록
  "list.title.forecast": { ko: "어떤 공연 보러 가요?", en: "Which show are you going to?" },
  "list.title.replay": { ko: "작년 그날, 미리 알았다면", en: "If we had known last year" },
  "list.sub.forecast": { ko: "티켓을 누르면 그날 줄 서는 시간의 날씨와 준비물이 펼쳐져요.", en: "Tap a ticket to see the weather while you queue and what to bring." },
  "list.sub.replay": { ko: "2025년 실제 날씨로 다시 돌려 본 예보예요. 티켓을 눌러 보세요.", en: "Forecasts re-run on real 2025 weather. Tap a ticket." },
  "list.updated": { ko: "{t} 업데이트", en: "Updated {t}" },
  "list.base": { ko: "{t} 발표 예보 기준", en: "Forecast issued {t}" },
  "list.stale": { ko: "최신 예보를 받지 못해 {t} 발표 예보를 보여 드리고 있어요", en: "Couldn't refresh. Showing the forecast issued {t}" },
  "partial": { ko: "일부 시간 예보 없음", en: "Some hours missing" },
  "scale.large": { ko: "대기 규모 대", en: "Large crowd" },
  "scale.medium": { ko: "대기 규모 중", en: "Medium crowd" },
  "scale.small": { ko: "대기 규모 소", en: "Small crowd" },
  "scale.large.sub": { ko: "객석 1만 석 이상", en: "10,000+ seats" },
  "scale.medium.sub": { ko: "객석 5천~1만 석", en: "5,000–10,000 seats" },
  "kopis": { ko: "출처: (재)예술경영지원센터 공연예술통합전산망(www.kopis.or.kr), 한국체육산업개발(주)·국민체육진흥공단·기상청 공공데이터", en: "출처: (재)예술경영지원센터 공연예술통합전산망(www.kopis.or.kr), 한국체육산업개발(주)·국민체육진흥공단·기상청 공공데이터" },
  "list.photos": { ko: "사진 Pexels", en: "Photos: Pexels" },
  "list.none": { ko: "앞으로 3일 안에 올림픽공원 공연이 없어요.", en: "No Olympic Park shows in the next 3 days." },
  "list.loading.forecast": { ko: "예보를 준비하고 있어요", en: "The forecast is on its way" },
  "list.loading.replay": { ko: "2025 사례 준비 중", en: "2025 cases coming soon" },
  "list.loading.sub": { ko: "{f} 파일이 생기면 여기에 표시돼요.", en: "It will appear here once {f} is ready." },
  "levels.q": { ko: "단계는 어떻게 나눠요?", en: "How are the levels set?" },
  "levels.summer": { ko: "여름 체감온도", en: "Summer, feels-like" },
  "levels.winter": { ko: "겨울 체감온도", en: "Winter, feels-like" },
  "levels.src": { ko: "기상청 폭염·겨울철 체감온도 기준을 참고한 큐캐스트 자체 단계예요", en: "QueueCast's own levels, based on KMA heat and wind-chill thresholds" },
  "levels.s1": { ko: "주의 33℃ 이상", en: "Caution 33℃ or above" },
  "levels.s2": { ko: "경고 35℃ 이상", en: "Warning 35℃ or above" },
  "levels.s3": { ko: "위험 38℃ 이상", en: "Danger 38℃ or above" },
  "levels.w1": { ko: "주의 영하 10℃ 이하", en: "Caution −10℃ or below" },
  "levels.w2": { ko: "경고 영하 25℃ 이하", en: "Warning −25℃ or below" },

  // 티켓
  "ticket.feel": { ko: "대기 체감", en: "Queue feel" },
  "ticket.hint": { ko: "{t} 이후 도착 추천", en: "Arrive after {t}" },
  "ticket.hint.safe": { ko: "편하게 오셔도 돼요", en: "Come whenever you like" },
  "ticket.en": { ko: "해외 관객이 많은 공연", en: "Many international fans" },
  "ticket.people": { ko: "약 {n}명", en: "~{n} fans" },

  // 공연 화면
  "back": { ko: "공연 목록", en: "All shows" },
  "notfound": { ko: "공연을 찾지 못했어요.", en: "We couldn't find that show." },
  "hero.feel": { ko: "줄 서는 동안 체감", en: "Feels like in the queue" },
  "hero.level": { ko: "{l} 단계", en: "{l} level" },
  "hero.people": { ko: "예상 관객 약 {n}명", en: "About {n} fans expected" },
  "hero.foreign": { ko: "해외 팬이 많은 공연이에요", en: "Many international fans" },
  "cd.until": { ko: "공연까지", en: "Showtime in" },
  "cd.d": { ko: "일", en: "d" },
  "cd.h": { ko: "시간", en: "h" },
  "cd.m": { ko: "분", en: "m" },
  "cd.s": { ko: "초", en: "s" },
  "cd.past": { ko: "지난 공연을 다시 돌려 본 예보예요", en: "A forecast re-run for a past show" },
  "cd.now": { ko: "지금 공연 중이거나 끝났어요", en: "The show has started or ended" },
  "share": { ko: "같이 가는 친구에게 보내기", en: "Send to a friend" },
  "share.copied": { ko: "링크를 복사했어요", en: "Link copied" },
  "share.text": {
    ko: "{title} ({date} {time})\n줄 서는 시간 체감 {feel}°, {arr} 이후 도착 추천! 큐캐스트에서 준비물 확인해 봐",
    en: "{title} ({date} {time})\nFeels like {feel}° in the queue. Arrive after {arr}! Check what to bring on QueueCast",
  },
  "plan.title": { ko: "그날의 타임라인", en: "Your day" },
  "pack.title": { ko: "가방 챙기기", en: "Pack your bag" },
  "pack.count": { ko: "<b data-pack-done>{d}</b> / {n}개 챙겼어요", en: "<b data-pack-done>{d}</b> of {n} packed" },
  "pack.done": { ko: "준비 끝!", en: "All set!" },
  "strip.title": { ko: "기다리는 동안 체감온도", en: "Feels-like while you wait" },
  "strip.more": { ko: "자세한 수치 보기", en: "Show details" },
  "strip.none": { ko: "시간별 예보가 아직 없어요.", en: "No hourly forecast yet." },
  "th.time": { ko: "시각", en: "Time" },
  "th.temp": { ko: "기온", en: "Temp" },
  "th.hum": { ko: "습도", en: "Humidity" },
  "th.wind": { ko: "풍속", en: "Wind" },
  "th.feel": { ko: "체감", en: "Feels" },
  "th.level": { ko: "단계", en: "Level" },
  "foot": { ko: "{t} 기준 {m} · 사진 Pexels", en: "{m} as of {t} · Photos: Pexels" },
  "foot.forecast": { ko: "예보", en: "Forecast" },
  "foot.replay": { ko: "재현", en: "Replay" },
  "others": { ko: "다른 공연 티켓", en: "Other tickets" },

  // 타임라인
  "tl.queue": { ko: "야외 대기 시작", en: "Outdoor queue starts" },
  "tl.queue.sub": { ko: "MD·입장 줄이 생기는 시간", en: "Merch and entry lines form" },
  "tl.parking": { ko: "주차장 만차 예상", en: "Parking likely full" },
  "tl.parking.sub": { ko: "이후엔 대중교통이 편해요", en: "Public transport is easier after this" },
  "tl.hot": { ko: "가장 더운 시간", en: "Hottest hour" },
  "tl.cold": { ko: "가장 추운 시간", en: "Coldest hour" },
  "tl.risk.sub": { ko: "체감 {f}° · {l}", en: "Feels {f}° · {l}" },
  "tl.arrive": { ko: "이때 도착하면 딱 좋아요", en: "The best time to arrive" },
  "tl.arrive.sub": { ko: "추천 도착 시간", en: "Recommended arrival" },
  "tl.show": { ko: "공연 시작", en: "Show starts" },

  // 관객 안내
  "aud.title": { ko: "관객 안내", en: "Notice for fans" },
  "aud.safe": { ko: "특이사항 없음. 즐거운 관람 되세요!", en: "No special notice. Enjoy the show!" },
  "aud.copy": { ko: "안내 문구 복사", en: "Copy message" },
  "aud.copied": { ko: "복사했어요", en: "Copied" },
  "aud.copyfail": { ko: "복사하지 못했어요", en: "Couldn't copy" },
  "aud.shelter": { ko: "가장 가까운 실내 쉼터", en: "Nearest indoor shelter" },
  "aud.shelter.go": { ko: "추우면 여기서 몸을 녹이세요", en: "Warm up here if you get cold" },
  "aud.shelter.go.summer": { ko: "더우면 여기서 쉬어 가세요", en: "Cool down here if it gets hot" },

  // 편의시설
  "fac.title": { ko: "가까운 편의시설", en: "Nearby facilities" },
  "fac.note": { ko: "{v}에서 직선거리예요. 누르면 지도가 열려요.", en: "Straight-line distance from {v}. Tap to open the map." },
  "fac.none": { ko: "근처에 없어요", en: "None nearby" },
  "fac.more": { ko: "외 {n}곳", en: "+{n} more" },
  "fac.실내 쉼터": { ko: "실내 쉼터", en: "Indoor shelter" },
  "fac.화장실": { ko: "화장실", en: "Restroom" },
  "fac.음수대": { ko: "음수대", en: "Water" },
  "fac.자판기": { ko: "자판기", en: "Vending" },
  "fac.간이편의점": { ko: "간이편의점", en: "Kiosk" },

  // 공단·주최사
  "org.title": { ko: "공단·주최사 대응 체크리스트", en: "Checklist for organizers" },
  "org.none": { ko: "특이사항 없음", en: "No special action needed" },
  "org.count": { ko: "{n}개", en: "{n} items" },
  "org.note": { ko: "현장 점검용 체크예요. 새로고침하면 지워져요.", en: "For on-site checks. Clears on refresh." },
  "org.ko": { ko: "", en: "Written in Korean for venue staff." },
  "org.scale": { ko: "관객 규모 추가 조치", en: "Extra steps for crowd size" },
  "org.scale.sub": { ko: "{s} ({n})", en: "{s} ({n})" },

  // 공단·주최사 대응 가이드
  "view.fan": { ko: "관객용", en: "For fans" },
  "view.org": { ko: "공단·주최사용", en: "For organizers" },
  "guide.title": { ko: "단계별 대응 가이드", en: "Response guide by level" },
  "guide.ladder": { ko: "위험 단계", en: "Risk level" },
  "guide.forecast": { ko: "오늘 예보", en: "Forecast" },
  "guide.today": { ko: "이 공연은 {l} 단계로 예보됐어요.", en: "This show is forecast at {l} level." },
  "guide.today.hrs": { ko: "이 공연은 {h}이 {l} 단계예요.", en: "{h} is forecast at {l} level." },
  "guide.preview.up": { ko: "{l} 단계 미리 보기 · 예보가 올라가면 이렇게 대응해요.", en: "Preview of {l} · what to do if the forecast rises." },
  "guide.preview.down": { ko: "{l} 단계 미리 보기 · 오늘 예보보다 낮은 단계예요.", en: "Preview of {l} · below today's forecast." },
  "guide.sum": { ko: "{a}개 분야 · 조치 {n}개", en: "{a} areas · {n} actions" },
  "guide.note": { ko: "체크한 항목은 이 브라우저에 저장돼요. 현장 상황에 맞게 조정해서 쓰세요.", en: "Checks are saved in this browser. Adjust to conditions on site." },
  "guide.cta": { ko: "공단·주최사용 단계별 대응 가이드 보기", en: "Open the response guide for organizers" },
  "guide.cta.sub": { ko: "그늘막·실내 대기 공간·의료 인력 등 분야별 조치와 시간", en: "Shade, indoor waiting, medical staff and more, with timing" },
  "cat.shade": { ko: "그늘·급수", en: "Shade & water" },
  "cat.warm": { ko: "바람막이·보온", en: "Wind & warmth" },
  "cat.indoor": { ko: "실내 대기 공간", en: "Indoor waiting" },
  "cat.medical": { ko: "의료 인력", en: "Medical staff" },
  "cat.queue": { ko: "입장·줄 운영", en: "Entry & queues" },
  "cat.notice": { ko: "관객 안내", en: "Fan notices" },
  "when.now": { ko: "미리 준비", en: "Ahead of time" },
  "when.before": { ko: "{t} 전까지", en: "By {t}" },
  "when.during": { ko: "{a}~{b} 내내", en: "{a}–{b}" },
  "when.peak": { ko: "{a}~{b} 집중", en: "Focus {a}–{b}" },
  "when.after": { ko: "공연 끝난 뒤", en: "After the show" },

  // 예보 전
  "ticket.hint.pending": { ko: "예보는 공연 3일 전부터 나와요", en: "Forecast opens 3 days before" },
  "strip.pending": { ko: "아직 예보 전이에요. 공연 3일 전부터 시간별 체감온도가 나와요.", en: "No forecast yet. Hourly feels-like opens 3 days before the show." },
  "aud.pending": { ko: "아직 예보 전이에요. 예보가 나오면 날씨에 맞는 안내를 알려 드려요.", en: "No forecast yet. We'll post a notice once it's out." },
  "guide.pending": { ko: "아직 예보 전이에요. 주의 단계부터 미리 볼 수 있어요.", en: "No forecast yet. Preview from the Caution level." },
  "mood.pending": { ko: "곧 나와요", en: "Coming soon" },

  // 상태 말투
  "mood.summer.safe": { ko: "괜찮아요", en: "All good" },
  "mood.summer.caution": { ko: "더워요", en: "Hot" },
  "mood.summer.warning": { ko: "많이 더워요", en: "Very hot" },
  "mood.summer.danger": { ko: "위험해요", en: "Dangerous" },
  "mood.winter.safe": { ko: "괜찮아요", en: "All good" },
  "mood.winter.caution": { ko: "추워요", en: "Cold" },
  "mood.winter.warning": { ko: "많이 추워요", en: "Very cold" },
  "theme.concert": { ko: "콘서트", en: "Concert" },
  "theme.christmas": { ko: "크리스마스", en: "Christmas" },
  "genre.concert": { ko: "콘서트", en: "Concert" },
  "genre.musical": { ko: "뮤지컬", en: "Musical" },
  "genre.play": { ko: "연극", en: "Play" },
  "genre.classical": { ko: "클래식", en: "Classical" },
  "genre.korean": { ko: "국악", en: "Korean music" },
  "genre.dance": { ko: "무용", en: "Dance" },
  "genre.circus": { ko: "서커스·마술", en: "Circus & magic" },
  "genre.mixed": { ko: "공연", en: "Show" },
  "greet.concert": { ko: "무대 조명이 켜지기 전까지, 기다리는 시간도 즐겁게", en: "Enjoy the wait until the stage lights come on" },
  "greet.christmas": { ko: "따뜻하게 입고 와서 연말을 즐겨요", en: "Dress warm and enjoy the holidays" },
};

// t("key", { var }) → 현재 언어 문구. 없는 키는 키 자체를 돌려줘서 빠진 번역이 눈에 띄게
export function t(key, vars = {}, l = current) {
  const entry = T[key];
  let s = entry ? entry[l] ?? entry.ko : key;
  for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v);
  return s;
}

export function hasKey(key) {
  return key in T;
}
