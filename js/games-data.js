// 게임 메타데이터 (참고/정보 제공용)
const gamesData = [
  { name: "메탈슬러그 (Metal Slug)", core: "fbneo", genre: "런앤건", year: 1996, status: "완벽 호환" },
  { name: "더 킹 오브 파이터즈 '98", core: "fbneo", genre: "대전격투", year: 1998, status: "완벽 호환" },
  { name: "스트리트 파이터 II", core: "mame2003", genre: "대전격투", year: 1991, status: "완벽 호환" },
  { name: "보글보글 (Bubble Bobble)", core: "mame2003", genre: "플랫포머", year: 1986, status: "완벽 호환" },
  { name: "캐딜락 & 디노사우르스", core: "fbneo", genre: "벨트스크롤 액션", year: 1993, status: "완벽 호환" }
];

// ─────────────────────────────────────────────
// 코어(에뮬레이터) 관련 공용 메타데이터
// main.js, emulator.js에서 함께 참조합니다.
// ─────────────────────────────────────────────
const CORE_LABELS = {
  fbneo: "NEOGEO/CPS",
  mame2003: "MAME",
  snes: "Super Famicom"
};

const CORE_EXTENSIONS = {
  fbneo: [".zip"],
  mame2003: [".zip"],
  snes: [".smc", ".sfc"]
};
