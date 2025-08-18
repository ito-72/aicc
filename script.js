// ====== 既存 冒頭はそのまま ======
let quizData = null;   // 出題対象
let allData = null;    // 誤答候補用
let quizList = [];
let userAnswers = [];
let correctCount = 0;

// ====== ▼ 選択状態を保持 ======
let selectedSheets = [];              // 階層1: シート
let selectedHeaders = {};             // 階層2: 項目 {sheet: [header,...]}
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

// ====== ▼ 初期化 ======
window.addEventListener("DOMContentLoaded", () => {
  initSheetTabs();      // 階層1
  initRoomTabs();       // 階層3
  initQuizCountTabs();  // 階層4
  initQuizModeTabs();   // 階層5
});

// ====== ▼ ユーティリティ ======
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// 値から数値だけを取り出して Number 化（取り出せなければ null）
function toNumeric(value) {
  if (value === null || value === undefined) return null;
  const s = String(value);
  const digits = s.replace(/[^\d.-]/g, ""); // マイナスや小数点に対応
  if (digits === "" || /^-?\.?$/.test(digits)) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

// 表示用のフォーマット（priceシートの数値は¥カンマ区切り）
function formatDisplay(sheet, v) {
  if (sheet === "price") {
    const num = toNumeric(v);
    if (num !== null) return `¥${num.toLocaleString("ja-JP")}`;
  }
  return String(v);
}

// コメント取得
function getComment(score) {
  for (const group of comments) {
    const [min, max] = group.range;
    if (score >= min && score <= max) {
      const messages = group.messages;
      return messages[Math.floor(Math.random() * messages.length)];
    }
  }
  return "";
}

// ========== ここから既存タブ・ロード群（変更なし） ==========
function initSheetTabs() {
  const sheetTabs = document.querySelectorAll("#sheet-tabs .tab");
  sheetTabs.forEach(tab => {
    tab.addEventListener("click", async () => {
      const sheet = tab.dataset.sheet;

      if (selectedSheets.includes(sheet)) {
        selectedSheets = selectedSheets.filter(s => s !== sheet);
        tab.classList.remove("active");
        delete selectedHeaders[sheet];
      } else {
        selectedSheets.push(sheet);
        tab.classList.add("active");
        if (sheet !== "tools") {
          await loadHeadersForSheet(sheet); // toolsは項目タブ不要
        }
      }
      console.log("選択中シート:", selectedSheets);
    });
  });
}

async function loadHeadersForSheet(sheetName) {
  try {
    const res = await fetch(`${CONFIG.GAS_URL}?sheet=${encodeURIComponent(sheetName)}`);
    const data = await res.json();
    const headers = data[0].slice(1); // A列は会場名 or ラベルなのでB列以降

    const container = document.getElementById("header-tabs");
    Array.from(container.querySelectorAll(`button[data-sheet="${sheetName}"]`)).forEach(b => b.remove());

    headers.forEach(header => {
      const btn = document.createElement("button");
      btn.className = "tab";
      btn.textContent = header;
      btn.dataset.sheet = sheetName;
      btn.dataset.header = header;

      btn.addEventListener("click", () => {
        if (!selectedHeaders[sheetName]) selectedHeaders[sheetName] = [];
        if (selectedHeaders[sheetName].includes(header)) {
          selectedHeaders[sheetName] = selectedHeaders[sheetName].filter(h => h !== header);
          btn.classList.remove("active");
        } else {
          selectedHeaders[sheetName].push(header);
          btn.classList.add("active");
        }
        console.log("選択中項目:", selectedHeaders);
      });

      container.appendChild(btn);
    });
  } catch (e) {
    console.error("ヘッダー取得に失敗", e);
  }
}

async function initRoomTabs() {
  try {
    const res = await fetch(`${CONFIG.GAS_URL}?sheet=rooms`);
    const data = await res.json();
    const rows = data.slice(1);
    const roomNames = rows.map(r => r[0]).filter(v => v !== "");

    const container = document.getElementById("room-tabs");
    container.innerHTML = "";
    roomNames.forEach(room => {
      const btn = document.createElement("button");
      btn.className = "tab";
      btn.textContent = room;
      btn.dataset.room = room;
      btn.addEventListener("click", () => {
        if (selectedRooms.includes(room)) {
          selectedRooms = selectedRooms.filter(r => r !== room);
          btn.classList.remove("active");
        } else {
          selectedRooms.push(room);
          btn.classList.add("active");
        }
        console.log("選択中会場:", selectedRooms);
      });
      container.appendChild(btn);
    });
  } catch (e) {
    console.error("会場データ取得に失敗しました", e);
  }
}

function initQuizCountTabs() {
  const countTabs = document.querySelectorAll("#quiz-count-tabs .tab");
  countTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      countTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      quizCount = parseInt(tab.dataset.count, 10);
      console.log("問題数:", quizCount);
    });
  });
}

function initQuizModeTabs() {
  const modeTabs = document.querySelectorAll("#quiz-mode-tabs .tab");
  modeTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      modeTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      quizMode = tab.dataset.mode; // "choice" or "input"
      console.log("出題モード:", quizMode);
    });
  });
}

// ====== ▼ クイズ生成開始（Access対応を追加） ======
document.getElementById("start-button").onclick = async () => {
  if (selectedSheets.length === 0) {
    alert("少なくとも1つのシートを選んでください");
    return;
  }

  try {
    let mergedData = [];
    let mergedAllData = [];
    for (const sheet of selectedSheets) {
      const res = await fetch(`${CONFIG.GAS_URL}?sheet=${encodeURIComponent(sheet)}`);
      const data = await res.json();
      const headers = data[0];
      const rows = data.slice(1).filter(r => r[0] !== ""); // 空行スキップ
      mergedData.push({ sheet, headers, rows });
      mergedAllData.push({ sheet, headers, rows });
    }

    quizData = mergedData;
    allData = mergedAllData;

    generateQuizList();

    if (quizList.length === 0) {
      alert("出題できる問題がありませんでした");
      return;
    }

    renderAllQuizzes();

    document.getElementById("start-button").style.display = "none";
    document.getElementById("quiz-container").style.display = "block";
    document.getElementById("check-score").style.display = "inline-block";
  } catch (e) {
    console.error("データ取得に失敗しました", e);
  }
};

// ====== ▼ 問題リスト生成（Access専用分岐を追加） ======
function generateQuizList() {
  quizList = [];
  userAnswers = [];

  // tools は常に選択式
  if (selectedSheets.includes("tools")) {
    generateToolsQuiz();
    return;
  }
  // fee_tools は選択式・記述式対応
  if (selectedSheets.includes("fee_tools")) {
    generateFeeToolsQuiz();
    return;
  }
  // Access は独自ロジック（混在を避ける同一方針）
  if (selectedSheets.includes("access")) {
    generateAccessQuiz();
    return;
  }

  // ▼ 通常（rooms / price / layout …）
  const candidates = [];
  quizData.forEach(({ sheet, headers, rows }) => {
    rows.forEach(row => {
      // 会場フィルタ
      if (selectedRooms.length && !selectedRooms.includes(row[0])) return;

      headers.forEach((header, colIndex) => {
        if (colIndex === 0) return; // A列は会場名

        // 項目フィルタ
        if (selectedHeaders[sheet] && selectedHeaders[sheet].length > 0) {
          if (!selectedHeaders[sheet].includes(header)) return;
        }

        const correctRaw = row[colIndex];
        if (correctRaw === "" || correctRaw === null || correctRaw === undefined) return;

        if (quizMode === "choice") {
          const otherChoicesRaw = allData
            .filter(q => q.sheet === sheet)
            .flatMap(q => q.rows.map(r => r[colIndex]))
            .filter(v => v !== "" && v !== null && v !== undefined && String(v) !== String(correctRaw));

          let wrongs = [...new Set(otherChoicesRaw)];
          if (wrongs.length < 3) {
            const correctNum = toNumeric(correctRaw);
            if (correctNum !== null) {
              let delta = Math.max(1, Math.round(Math.abs(correctNum) * 0.1));
              while (wrongs.length < 3) {
                const cand = correctNum + (wrongs.length % 2 === 0 ? delta : -delta);
                if (!wrongs.some(w => String(toNumeric(w)) === String(cand))) {
                  wrongs.push(cand);
                }
                delta += 1;
                if (delta > 10) break;
              }
            }
          }
          if (wrongs.length < 3) return;

          const questionText = `${row[0]} の ${headers[colIndex]} は？`;
          const choicesRaw = shuffleArray([correctRaw, ...shuffleArray(wrongs).slice(0, 3)]);
          const answerIndex = choicesRaw.findIndex(c => String(c) === String(correctRaw));
          const choicesDisplay = choicesRaw.map(v => formatDisplay(sheet, v));

          candidates.push({
            type: "choice",
            sheet,
            questionText,
            choicesRaw,
            choicesDisplay,
            answerIndex
          });
        } else if (quizMode === "input") {
          const correctNum = toNumeric(correctRaw);
          if (correctNum === null) return;

          const questionText = `[${sheet}] ${row[0]} の ${headers[colIndex]} は？`;
          candidates.push({
            type: "input",
            sheet,
            questionText,
            correctNumber: correctNum,
            correctDisplay: formatDisplay(sheet, correctRaw)
          });
        }
      });
    });
  });

  const maxCount = Math.min(quizCount, candidates.length);
  quizList = shuffleArray(candidates).slice(0, maxCount);
  userAnswers = new Array(quizList.length).fill(null);
}

// ====== ▼ Access（駐車場）専用ロジック ======
function generateAccessQuiz() {
  const access = quizData.find(q => q.sheet === "access");
  if (!access) return;

  const { headers, rows } = access;
  const tmpList = [];

  // ヘルパ：ラベルで行を取得
  const findRowByLabel = (label) => rows.find(r => String(r[0]).trim() === label);

  // 時刻ユーティリティ
  const parseHM = (s) => {
    const [h, m] = String(s).split(":").map(n => parseInt(n, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  };
  const fmtHM = (minTotal) => {
    let h = Math.floor(minTotal / 60);
    let m = minTotal % 60;
    if (m < 0) m += 60, h -= 1;
    if (h < 0) h += 24;
    h = h % 24;
    const mm = String(m).padStart(2, "0");
    // 表記は "6:30" 形式（先頭ゼロは付けない）
    return `${h}:${mm}`;
  };
  const nearbyTimes = (baseStr) => {
    const base = parseHM(baseStr);
    if (base === null) return { choices: [String(baseStr)], answerIndex: 0 };
    const offsets = [-15, -10, -5, 5, 10, 15, 20, -20];
    const wrongs = [];
    for (const off of offsets) {
      const cand = fmtHM(base + off);
      if (cand !== baseStr && !wrongs.includes(cand)) wrongs.push(cand);
      if (wrongs.length >= 3) break;
    }
    const choices = shuffleArray([baseStr, ...wrongs.slice(0, 3)]);
    return { choices, answerIndex: choices.indexOf(baseStr) };
  };

  // 1) 営業時間（開始・終了のダブル4択：両方当たれば正解）
  const hoursRow = findRowByLabel("営業時間は？");
  if (hoursRow) {
    const startStr = String(hoursRow[1]).trim(); // B列
    const endStr   = String(hoursRow[2]).trim(); // C列
    const left  = nearbyTimes(startStr);
    const right = nearbyTimes(endStr);

    tmpList.push({
      type: "double-choice",
      questionText: "営業時間は？",
      leftLabel: "開始",
      rightLabel: "終了",
      leftChoices: left.choices,
      rightChoices: right.choices,
      leftAnswerIndex: left.answerIndex,
      rightAnswerIndex: right.answerIndex
    });
  }

  // 2) 収容台数（171）
  const capRow = findRowByLabel("収容台数は？");
  if (capRow) {
    const correctNum = toNumeric(capRow[1]);
    if (correctNum !== null) {
      // 近傍数生成
      const wrongs = [];
      let delta = 1;
      while (wrongs.length < 3 && delta <= 15) {
        [correctNum - delta, correctNum + delta].forEach(v => {
          if (v >= 0 && !wrongs.includes(v) && v !== correctNum && wrongs.length < 3) wrongs.push(v);
        });
        delta++;
      }
      const choicesRaw = shuffleArray([correctNum, ...wrongs.slice(0, 3)]);
      const answerIndex = choicesRaw.findIndex(v => v === correctNum);

      tmpList.push({
        type: "choice",
        questionText: "収容台数は？",
        choicesRaw,
        choicesDisplay: choicesRaw.map(String),
        answerIndex
      });
    }
  }

  // 3) 駐車料金（30分）… ¥表記で表示
  const feeRow = findRowByLabel("駐車料金は？（30分）");
  if (feeRow) {
    const correctNum = toNumeric(feeRow[1]); // 500
    if (correctNum !== null) {
      const wrongs = [];
      let step = 50; // 50円刻みで近傍を作る
      let k = 1;
      while (wrongs.length < 3 && k <= 6) {
        [correctNum - step * k, correctNum + step * k].forEach(v => {
          if (v > 0 && !wrongs.includes(v) && v !== correctNum && wrongs.length < 3) wrongs.push(v);
        });
        k++;
      }
      const choicesRaw = shuffleArray([correctNum, ...wrongs.slice(0, 3)]);
      const answerIndex = choicesRaw.findIndex(v => v === correctNum);

      tmpList.push({
        type: "choice",
        questionText: "駐車料金は？（30分）",
        choicesRaw,
        choicesDisplay: choicesRaw.map(n => `¥${Number(n).toLocaleString("ja-JP")}`),
        answerIndex
      });
    }
  }

  // 4) 機械式・平面式・搬入出・入口 行：1行目ヘッダーとリンク
  //    1行目: [A:ラベル, B:最大高mm, C:重量kg, D:幅mm, E:全長mm, F:最大料金, G:台数]
  const headerRow = access.headers; // 先頭行
  // 対象行：ラベルが「機械式」「平面」「搬入出」「駐車場入り口」を含むもの
  const targetRows = rows.filter(r => {
    const label = String(r[0]).trim();
    if (!label) return false;
    return /(機械式|平面式|搬入出|駐車場入り口)/.test(label);
  });

  targetRows.forEach(r => {
    const label = String(r[0]).trim();
    for (let col = 1; col < headerRow.length; col++) {
      const h = headerRow[col];
      const val = r[col];
      if (val === "" || val === null || val === undefined) continue;

      const correctNum = toNumeric(val);
      // 表示は最大料金だけ¥、他は数値のまま（単位はヘッダー名に含まれている）
      const display = (h && /料金/.test(h))
        ? (correctNum !== null ? `¥${correctNum.toLocaleString("ja-JP")}` : String(val))
        : String(correctNum ?? val);

      if (quizMode === "input" && correctNum !== null) {
        tmpList.push({
          type: "input",
          questionText: `${label} の ${h} は？`,
          correctNumber: correctNum,
          correctDisplay: display
        });
      } else {
        // 同列の他行から誤答候補
        const otherValues = targetRows
          .map(rr => rr[col])
          .filter(v => v !== "" && v !== null && v !== undefined && String(v) !== String(val));

        let wrongs = [...new Set(otherValues.map(v => toNumeric(v) ?? v))];

        // 足りなければ数値近傍生成
        if (wrongs.length < 3 && correctNum !== null) {
          let delta = Math.max(1, Math.round(Math.abs(correctNum) * 0.1));
          while (wrongs.length < 3) {
            const cand = correctNum + (wrongs.length % 2 === 0 ? delta : -delta);
            if (!wrongs.includes(cand) && cand >= 0) wrongs.push(cand);
            delta++;
            if (delta > 1000) break;
          }
        }
        if (wrongs.length < 3) continue;

        const choicesRaw = shuffleArray([val, ...shuffleArray(wrongs).slice(0, 3)]);
        const answerIndex = choicesRaw.findIndex(c => String(toNumeric(c) ?? c) === String(toNumeric(val) ?? val));
        const choicesDisplay = choicesRaw.map(v => {
          const num = toNumeric(v);
          return (h && /料金/.test(h))
            ? (num !== null ? `¥${num.toLocaleString("ja-JP")}` : String(v))
            : String(num ?? v);
        });

        tmpList.push({
          type: "choice",
          questionText: `${label} の ${h} は？`,
          choicesRaw,
          choicesDisplay,
          answerIndex
        });
      }
    }
  });

  // 問題数に合わせて反映
  quizList = shuffleArray(tmpList).slice(0, Math.min(quizCount, tmpList.length));
  userAnswers = new Array(quizList.length).fill(null);
}

// ====== ▼ 既存：無料付帯（tools） ======
function generateToolsQuiz() {
  const tools = quizData.find(q => q.sheet === "tools");
  if (!tools) return;

  const { headers, rows } = tools;
  const targetRows = selectedRooms.length ? rows.filter(r => selectedRooms.includes(r[0])) : rows;
  const tmpList = [];

  // 1) ワイヤレスハンドマイク（D列固定）
  targetRows.forEach(row => {
    const roomName = row[0];
    const handMic = row[3]; // D列
    if (handMic) {
      const choices = ["B帯", "赤外線", "グースネック", "A帯"];
      const answerIndex = choices.indexOf(handMic);
      if (answerIndex >= 0) {
        tmpList.push({
          type: "choice",
          questionText: `${roomName} の ワイヤレスハンドマイクは？`,
          choicesRaw: choices,
          choicesDisplay: choices,
          answerIndex
        });
      }
    }
  });

  // 2) あり/なし（ラベル列で判定）
  const ynItems = ["CDプレイヤー", "DVD/BDプレイヤー", "演台", "司会台", "レーザーポインタ"];
  const ynCols = ynItems
    .map(label => {
      const labelCol = headers.indexOf(label);
      return labelCol >= 0 ? { label, labelCol } : null;
    })
    .filter(x => x);

  targetRows.forEach(row => {
    const roomName = row[0];
    ynCols.forEach(({ label, labelCol }) => {
      const present = row[labelCol] !== "" && row[labelCol] !== null && row[labelCol] !== undefined;
      const ansIndex = present ? 0 : 1;
      tmpList.push({
        type: "choice",
        questionText: `${roomName} の ${label} は？`,
        choicesRaw: ["あり", "なし"],
        choicesDisplay: ["あり", "なし"],
        answerIndex: ansIndex
      });
    });
  });

  // 3) スペシャル（スクリーン / Guest Room）
  const specialLabels = ["スクリーン", "Guest Room"];
  const specialCols = specialLabels
    .map(label => {
      const labelCol = headers.indexOf(label);
      return labelCol >= 0 ? { label, valueCol: labelCol + 1 } : null;
    })
    .filter(x => x && x.valueCol < headers.length);

  targetRows.forEach(row => {
    const roomName = row[0];
    specialCols.forEach(({ label, valueCol }) => {
      const correct = row[valueCol];
      if (!correct) return;

      const wrongPool = rows.map(r => r[valueCol]).filter(v => v && v !== correct);
      const uniqueWrongs = [...new Set(wrongPool)];
      const wrongsSample = shuffleArray(uniqueWrongs).slice(0, 3);
      const choices = shuffleArray([correct, ...wrongsSample]);
      const answerIndex = choices.indexOf(correct);

      if (answerIndex >= 0) {
        tmpList.push({
          type: "choice",
          questionText: `${roomName} の ${label} は？`,
          choicesRaw: choices,
          choicesDisplay: choices,
          answerIndex
        });
      }
    });
  });

  // 4) 数量問題（名称・数量ペア）
  targetRows.forEach(row => {
    const roomName = row[0];
    for (let col = 3; col < headers.length - 1; col += 2) {
      const itemName = row[col];
      const qty = row[col + 1];
      if (!itemName || qty === "" || qty === null || qty === undefined) continue;

      const qtyNum = toNumeric(qty);
      if (qtyNum === null) continue;

      const wrongPool = rows
        .map(r => r[col + 1])
        .filter(v => (v || v === 0) && String(v) !== String(qty));
      const uniqueWrongs = [...new Set(wrongPool)];

      let wrongsSample = shuffleArray(uniqueWrongs).slice(0, 3);
      let deltaBase = Math.max(1, Math.round(Math.abs(qtyNum) * 0.1));
      while (wrongsSample.length < 3) {
        const cand = qtyNum + (wrongsSample.length % 2 === 0 ? deltaBase : -deltaBase);
        if (!wrongsSample.includes(cand) && cand >= 0) wrongsSample.push(cand);
        deltaBase += 1;
        if (deltaBase > 10) break;
      }

      const choices = shuffleArray([qty, ...wrongsSample]);
      const answerIndex = choices.findIndex(c => String(c) === String(qty));

      if (answerIndex >= 0) {
        tmpList.push({
          type: "choice",
          questionText: `${roomName} の ${itemName} の数量は？`,
          choicesRaw: choices,
          choicesDisplay: choices,
          answerIndex
        });
      }
    }
  });

  const limited = shuffleArray(tmpList).slice(0, Math.min(quizCount, tmpList.length));
  quizList = limited;
  userAnswers = new Array(quizList.length).fill(null);
}

// ▼ fee_tools は既存のまま（省略せずこのまま残してください）
function formatDisplayForFeeTools(colIndex, v) {
  const num = toNumeric(v);
  if (num === null) return String(v);
  if (colIndex === 1) return `¥${num.toLocaleString("ja-JP")}`; // B列のみ¥
  return String(num);
}
function generateFeeToolsQuiz() {
  // （既存実装をそのまま残す）
  /* ...既存の generateFeeToolsQuiz 本文... */
}

// ====== ▼ クイズ表示（double-choice描画を追加） ======
function renderAllQuizzes() {
  const container = document.getElementById("quiz-container");
  container.innerHTML = "";

  quizList.forEach((quiz, qIndex) => {
    const block = document.createElement("div");
    block.className = "quiz-block";

    const qText = document.createElement("div");
    qText.className = "quiz-question";
    qText.textContent = `第${qIndex + 1}問：${quiz.questionText}`;
    block.appendChild(qText);

    if (quiz.type === "choice") {
      const choicesDiv = document.createElement("div");
      choicesDiv.className = "choices";

      quiz.choicesDisplay.forEach((choice, cIndex) => {
        const btn = document.createElement("button");
        btn.textContent = `${choice}`;
        btn.className = "choice-button";
        btn.onclick = () => {
          if (userAnswers[qIndex] !== null) return;
          userAnswers[qIndex] = cIndex;

          choicesDiv.querySelectorAll("button").forEach(b => b.classList.remove("selected"));
          btn.classList.add("selected");

          const result = block.querySelector(".result");
          if (cIndex === quiz.answerIndex) {
            result.textContent = "✅ 正解！";
            result.style.color = "green";
          } else {
            result.textContent = `❌ 不正解。正解は「${quiz.choicesDisplay[quiz.answerIndex]}」`;
            result.style.color = "red";
          }
        };
        choicesDiv.appendChild(btn);
      });

      block.appendChild(choicesDiv);

    } else if (quiz.type === "input") {
      const inputWrap = document.createElement("div");
      const input = document.createElement("input");
      input.type = "text";
      input.inputMode = "numeric";
      input.setAttribute("pattern", "[0-9]*");
      input.className = "choice-input";
      input.placeholder = "数字で入力";
      inputWrap.appendChild(input);

      const btn = document.createElement("button");
      btn.textContent = "回答する";
      btn.className = "action-button";
      btn.onclick = () => {
        if (userAnswers[qIndex] !== null) return;
        const userNum = toNumeric(input.value.trim());
        userAnswers[qIndex] = userNum;

        const result = block.querySelector(".result");
        if (userNum !== null && userNum === quiz.correctNumber) {
          result.textContent = "✅ 正解！";
          result.style.color = "green";
        } else {
          result.textContent = `❌ 不正解。正解は「${quiz.correctDisplay}」`;
          result.style.color = "red";
        }
      };
      inputWrap.appendChild(btn);
      block.appendChild(inputWrap);

    } else if (quiz.type === "double-choice") {
      // ▼ 営業時間専用：開始・終了の2段4択
      const grid = document.createElement("div");
      grid.style.display = "grid";
      grid.style.gridTemplateColumns = "1fr 1fr";
      grid.style.gap = "12px";

      const makeChoiceGroup = (label, choices, correctIndex, key) => {
        const wrap = document.createElement("div");
        const cap = document.createElement("div");
        cap.textContent = label;
        cap.style.marginBottom = "6px";
        wrap.appendChild(cap);

        const choicesDiv = document.createElement("div");
        choicesDiv.className = "choices";

        choices.forEach((choice, idx) => {
          const btn = document.createElement("button");
          btn.textContent = `${choice}`;
          btn.className = "choice-button";
          btn.onclick = () => {
            if (!userAnswers[qIndex]) userAnswers[qIndex] = { left: null, right: null };
            // 既に両方確定していたら無視
            if (userAnswers[qIndex].left !== null && userAnswers[qIndex].right !== null) return;

            userAnswers[qIndex][key] = idx;
            choicesDiv.querySelectorAll("button").forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");

            const ans = userAnswers[qIndex];
            if (ans.left !== null && ans.right !== null) {
              const allCorrect = (ans.left === quiz.leftAnswerIndex) && (ans.right === quiz.rightAnswerIndex);
              const result = block.querySelector(".result");
              if (allCorrect) {
                result.textContent = "✅ 正解！（開始・終了とも一致）";
                result.style.color = "green";
              } else {
                const l = quiz.leftChoices[quiz.leftAnswerIndex];
                const r = quiz.rightChoices[quiz.rightAnswerIndex];
                result.textContent = `❌ 不正解。正解は「開始：${l}／終了：${r}」`;
                result.style.color = "red";
              }
            }
          };
          choicesDiv.appendChild(btn);
        });

        wrap.appendChild(choicesDiv);
        return wrap;
      };

      grid.appendChild(makeChoiceGroup(quiz.leftLabel,  quiz.leftChoices,  quiz.leftAnswerIndex,  "left"));
      grid.appendChild(makeChoiceGroup(quiz.rightLabel, quiz.rightChoices, quiz.rightAnswerIndex, "right"));
      block.appendChild(grid);
    }

    const resultDiv = document.createElement("div");
    resultDiv.className = "result";
    block.appendChild(resultDiv);

    container.appendChild(block);
  });
}

// ====== ▼ 採点処理（double-choice対応を追加） ======
document.getElementById("check-score").onclick = () => {
  correctCount = 0;

  userAnswers.forEach((answer, index) => {
    const q = quizList[index];
    if (q.type === "choice") {
      if (answer === q.answerIndex) correctCount++;
    } else if (q.type === "input") {
      if (answer !== null && answer === q.correctNumber) correctCount++;
    } else if (q.type === "double-choice") {
      if (answer && answer.left === q.leftAnswerIndex && answer.right === q.rightAnswerIndex) {
        correctCount++;
      }
    }
  });

  const comment = getComment(correctCount);
  const scoreDiv = document.getElementById("score");
  scoreDiv.textContent = `✅ ${correctCount} / ${quizList.length} 正解！\n${comment}`;
  document.getElementById("check-score").style.display = "none";

  const retryBtn = document.createElement("button");
  retryBtn.textContent = "もう一度";
  retryBtn.className = "action-button";
  retryBtn.onclick = () => {
    generateQuizList();
    renderAllQuizzes();
    document.getElementById("score").textContent = "";
    document.getElementById("check-score").style.display = "inline-block";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const otherQuizBtn = document.createElement("button");
  otherQuizBtn.textContent = "別のクイズ";
  otherQuizBtn.className = "action-button";
  otherQuizBtn.style.marginLeft = "8px";
  otherQuizBtn.onclick = () => location.reload();

  scoreDiv.appendChild(document.createElement("div"));
  scoreDiv.appendChild(retryBtn);
  scoreDiv.appendChild(otherQuizBtn);
};
