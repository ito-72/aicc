// ====== 状態 & 定数（グローバル） ======
let quizData = null;   // 出題対象（選択シートのデータ）
let allData = null;    // 誤答候補用（同上）
let quizList = [];
let userAnswers = [];
let correctCount = 0;

// 選択状態
let selectedSheets = [];              // 階層1: シート keys
let selectedHeaders = {};             // 階層2: 項目 {sheetKey: [header,...]}
let selectedRooms = [];               // 階層3: 会場
let quizCount = 10;                   // 階層4: 問題数
let quizMode = "choice";              // 階層5: 出題モード ("choice" / "input")

// スコアコメント
const comments = [
  { range: [0, 3], messages: ["次はもっと頑張ろう！", "ドンマイ！", "チャレンジあるのみ！"] },
  { range: [4, 6], messages: ["あと少し！", "惜しい！", "いい線いってる！"] },
  { range: [7, 9], messages: ["お見事！", "素晴らしい！", "もうちょっとで満点！"] },
  { range: [10, 10], messages: ["満点！すごい！", "完璧！", "天才！"] }
];

// 会場グループ定義（存在する部屋だけを自動採用）
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

// 会場名を文字列化して比較するためのヘルパー
function isRoomSelected(roomLabel) {
  const name = String(roomLabel).trim();
  const set = new Set(selectedRooms.map(v => String(v).trim()));
  return set.has(name);
}
