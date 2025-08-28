// ====== 状態 & 定数（グローバル） ======
let quizData = null;   // 出題対象（選択シートのデータ）
let allData = null;    // 誤答候補用
let quizList = [];
let userAnswers = [];
let correctCount = 0;

// ====== ブランド状態（階層0） ======
let brand = "AICC";  // "AICC" | "TACC"
const BRAND_CONFIG = {
  AICC: { prefix: "",   label: "AICC" },
  TACC: { prefix: "T_", label: "TACC" }
};

// ====== 選択状態 ======
let selectedSheets = [];    // 階層1: rooms/price/layout/tools/fee_tools/access（ブランド非依存キー）
let selectedHeaders = {};   // 階層2: {sheetKey: [header,...]}
let selectedRooms = [];     // 階層3: 会場名（A列）
let quizCount = 10;         // 階層4: 出題数
let quizMode = "choice";    // 階層5: "choice" | "input"

// ====== コメント候補 ======
const comments = [
  { range: [0, 3],  messages: ["次はもっと頑張ろう！", "ドンマイ！", "チャレンジあるのみ！"] },
  { range: [4, 6],  messages: ["あと少し！", "惜しい！", "いい線いってる！"] },
  { range: [7, 9],  messages: ["お見事！", "素晴らしい！", "もうちょっとで満点！"] },
  { range: [10, 10],messages: ["満点！すごい！", "完璧！", "天才！"] }
];

// ====== 会場グループ（存在する部屋のみ採用） ======
const ROOM_GROUPS = {
  "3階": ["301", "302", "303", "Boardroom", "Board前室"],
  "200㎡まで": ["301", "302", "303", "Boardroom", "Board前室", "401", "402", "403", "404", "405", "the Green"],
  "全て": "ALL"
};

// ====== 汎用ユーティリティ ======
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function toNumeric(value) {
  if (value === null || value === undefined) return null;
  const s = String(value);
  const digits = s.replace(/[^\d.-]/g, "");
  if (digits === "" || /^-?\.?$/.test(digits)) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

function formatDisplay(sheet, v) {
  if (sheet === "price") {
    const num = toNumeric(v);
    if (num !== null) return `¥${num.toLocaleString("ja-JP")}`;
  }
  return String(v);
}

function getComment(score) {
  for (const group of comments) {
    const [min, max] = group.range;
    if (score >= min && score <= max) {
      const messages = group.messages;
      return messages[Math.floor(Math.random() * (messages.length))];
    }
  }
  return "";
}

function isRoomSelected(roomLabel) {
  const name = String(roomLabel).trim();
  const set = new Set(selectedRooms.map(v => String(v).trim()));
  return set.has(name);
}

// ====== ブランド関連ユーティリティ ======
function getBrandPrefix() {
  return BRAND_CONFIG[brand]?.prefix || "";
}
function resolveSheetName(sheetKey) {
  // 例: brand=TACC のとき "rooms" -> "T_rooms"
  const prefix = getBrandPrefix();
  return prefix + sheetKey;
}

/**
 * ブランドに応じてUIテーマや画像を切替
 * - TACC：茶系テーマ・タイトル帯の背景=4.png
 * - AICC：青系テーマ・タイトル帯の背景=1.jpg
 * ※ #brand-hero は使わず2段化を回避
 */
function updateBrandUI() {
  const title = document.getElementById("brand-title");
  const logo  = document.getElementById("logo-text");

  // 表示名
  if (title) title.textContent = BRAND_CONFIG[brand]?.label || brand;
  if (logo)  logo.textContent  = BRAND_CONFIG[brand]?.label || brand;

  // テーマ用クラス（CSSで色や背景を切替）
  document.body.classList.toggle("theme-tacc", brand === "TACC");
  document.body.classList.toggle("theme-aicc", brand !== "TACC");

  // <meta name="theme-color"> を動的更新（モバイルのバー色など）
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => {
    // 茶系：#8B5A2B（TACC）、既定は#000000
    m.setAttribute("content", brand === "TACC" ? "#8B5A2B" : "#000000");
  });

  // 旧：ヒーロー要素は使わず二段化を防止
  const hero = document.getElementById("brand-hero");
  if (hero) {
    hero.style.display = "none";
    hero.style.backgroundImage = "";
  }
}

/**
 * ブランド切替時の選択状態/表示リセット
 * - カテゴリ（#sheet-tabs）はDOMを消さない（ボタン消失バグ対策）
 */
function resetSelectionsForBrand() {
  // 選択状態の中身だけリセット
  selectedSheets = [];
  selectedHeaders = {};
  selectedRooms = [];
  quizList = [];
  userAnswers = [];
  correctCount = 0;

  // カテゴリの「選択中ハイライト」だけ外す
  document.querySelectorAll('#sheet-tabs .tab.active').forEach(btn => btn.classList.remove('active'));

  // ヘッダー/会場/クイズ表示は一旦クリア
  ["header-tabs", "room-tabs", "quiz-container", "score"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = "";
  });

  // ボタン・表示の初期化
  const start = document.getElementById("start-button");
  const qc    = document.getElementById("quiz-container");
  const cs    = document.getElementById("check-score");
  if (start) start.style.display = "inline-block";
  if (qc)    qc.style.display    = "none";
  if (cs)    cs.style.display    = "none";

  // 見出しの右側サマリー反映
  setSummaryText("brand-tabs", [brand]);
  setSummaryText("sheet-tabs", []);
  setSummaryText("header-tabs", []);
  setSummaryText("room-tabs", []);
  setSummaryText("quiz-count-tabs", [`${quizCount}問`]);
  setSummaryText("quiz-mode-tabs", [quizMode === "choice" ? "選択" : "記述"]);
}
