// 선 아이콘 (이모지 대신). stroke 는 글자색을 따라간다
const wrap = (body, size = 22) =>
  `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const icon = {
  clock: (s) => wrap(`<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`, s),
  queue: (s) => wrap(`<circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="7" r="2.5"/><path d="M3 20v-3a4 4 0 0 1 8 0v3M13 20v-3a4 4 0 0 1 8 0v3"/>`, s),
  parking: (s) => wrap(`<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M10 16.5v-9h3.2a2.8 2.8 0 0 1 0 5.6H10"/>`, s),
  thermo: (s) => wrap(`<path d="M10 14.5V5a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0Z"/><path d="M12 11v6"/>`, s),
  walk: (s) => wrap(`<circle cx="13" cy="4.5" r="2"/><path d="m9 21 2.5-6.5L14 17v4M8 11l3-3.5 3 1.5 2 3M11.5 14.5 10 9"/>`, s),
  spark: (s) => wrap(`<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>`, s),
  restroom: (s) => wrap(`<circle cx="7" cy="5" r="2"/><circle cx="17" cy="5" r="2"/><path d="M5 21v-6H4l1.5-6h3L10 15H9v6M15 21V9h4v6h-1v6M12 3v18"/>`, s),
  water: (s) => wrap(`<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/>`, s),
  cup: (s) => wrap(`<path d="M6 8h12l-1.5 12h-9L6 8ZM5 5h14M9 2.5 10 5"/>`, s),
  share: (s) => wrap(`<path d="M12 15V3M7.5 7.5 12 3l4.5 4.5"/><path d="M5 12v6.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V12"/>`, s),
  shelter: (s) => wrap(`<path d="M3 11 12 4l9 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/>`, s),
  umbrella: (s) => wrap(`<path d="M3 12a9 9 0 0 1 18 0Z"/><path d="M12 12v7a2 2 0 0 1-4 0"/><path d="M12 3v0"/>`, s),
  wind: (s) => wrap(`<path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h16a3 3 0 1 1-3 3"/><path d="M3 16h7"/>`, s),
  medical: (s) => wrap(`<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><path d="M12 8v8M8 12h8"/>`, s),
  megaphone: (s) => wrap(`<path d="M4 10v4a1 1 0 0 0 1 1h2l7 4V5L7 9H5a1 1 0 0 0-1 1Z"/><path d="M17.5 9.5a3.5 3.5 0 0 1 0 5"/><path d="M7 15l1.5 5"/>`, s),
  store: (s) => wrap(`<path d="M4 9.5 5.5 4h13L20 9.5"/><path d="M4 9.5h16v1a2.7 2.7 0 0 1-5.3 0 2.7 2.7 0 0 1-5.4 0 2.7 2.7 0 0 1-5.3 0Z"/><path d="M5.5 12.5V20h13v-7.5"/><path d="M10 20v-4h4v4"/>`, s),
  check: (s) => wrap(`<path d="m5 12.5 4.5 4.5L19 7.5"/>`, s),
  ticket: (s) => wrap(`<path d="M3 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4v1.5A1.5 1.5 0 0 0 4.5 19h15a1.5 1.5 0 0 0 1.5-1.5V16a2 2 0 0 1 0-4 2 2 0 0 0 0-4V6.5A1.5 1.5 0 0 0 19.5 5h-15A1.5 1.5 0 0 0 3 6.5Z"/><path d="M15 5v14" stroke-dasharray="2 2.5"/>`, s),
};
