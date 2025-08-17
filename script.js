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
let quizMode = "choice";              // 階層5: 出題モード

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

// ====== ▼ 階層1: シートタブ ======
function initSheetTabs() {
  const sheetTabs = document.querySelectorAll("#sheet-tabs .tab");
  sheetTabs.forEach(tab => {
    tab.addEventListener("click", async () => {
      const sheet = tab.dataset.sheet;

      if (selectedSheets.includes(sheet)) {
        selectedSheets = selectedSheets.filter(s => s !== sheet);
        tab.classList.remove("active");
        // シート外したらヘッダも消す
        delete selectedHeaders[sheet];
      } else {
        selectedSheets.push(sheet);
        tab.classList.add("active");
        await loadHeadersForSheet(sheet); // 階層2をロード
      }
      console.log("選択中シート:", selectedSheets);
    });
  });
}

// ====== ▼ 階層2: 項目タブ（ヘッダー行） ======
async function loadHeadersForSheet(sheetName) {
  try {
    const res = await fetch(`${CONFIG.GAS_URL}?sheet=${encodeURIComponent(sheetName)}`);
    const data = await res.json();
    const headers = data[0].slice(1); // A列は会場名なのでB列以降

    const container = document.getElementById("header-tabs");
    // 追記式にして「選んだシートの項目全部」を並べる
    headers.forEach(header => {
      const btn = document.createElement("button");
      btn.className = "tab";
      btn.textContent = `[${sheetName}] ${header}`;
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

// ====== ▼ 階層3: 会場タブ ======
async function initRoomTabs() {
  try {
    const res = await fetch(`${CONFIG.GAS_URL}?sheet=rooms`);
    const data = await res.json();
    const rows = data.slice(1);
    const roomNames = rows.map(r => r[0]).filter(v => v !== "");

    const container = document.getElementById("room-tabs");
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

// ====== ▼ 階層4: 問題数タブ ======
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

// ====== ▼ 階層5: 出題形式タブ ======
function initQuizModeTabs() {
  const modeTabs = document.querySelectorAll("#quiz-mode-tabs .tab");
  modeTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      modeTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      quizMode = tab.dataset.mode;
      console.log("出題モード:", quizMode);
    });
  });
}

// ====== ▼ クイズ生成開始 ======
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
      const rows = data.slice(1);

      // 出題用（選択会場のみ）
      const filtered = (selectedRooms.length > 0)
        ? rows.filter(r => selectedRooms.includes(r[0]))
        : rows;
      mergedData.push({ sheet, headers, rows: filtered });

      // 誤答候補用（全会場）
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

// ====== ▼ 問題リスト生成 ======
function generateQuizList() {
  quizList = [];
  userAnswers = [];

  const candidates = [];
  quizData.forEach(({ sheet, headers, rows }) => {
    rows.forEach(row => {
      headers.forEach((header, colIndex) => {
        if (colIndex === 0) return; // A列は会場名

        // 階層2: 選んだ項目だけ出題
        if (selectedHeaders[sheet] && selectedHeaders[sheet].length > 0) {
          if (!selectedHeaders[sheet].includes(header)) return;
        }

        const correctAnswerRaw = row[colIndex];
        if (!correctAnswerRaw || correctAnswerRaw === "") return;

        // 誤答候補
        const otherChoicesRaw = allData
          .filter(q => q.sheet === sheet)
          .flatMap(q => q.rows.map(r => r[colIndex]))
          .filter(v => v !== "" && v !== correctAnswerRaw);

        if (otherChoicesRaw.length < 3) return;

        candidates.push({ sheet, row, colIndex, correctAnswerRaw, headers });
      });
    });
  });

  const maxCount = Math.min(quizCount, candidates.length);
  const selected = shuffleArray(candidates).slice(0, maxCount);

  selected.forEach(({ sheet, row, colIndex, correctAnswerRaw, headers }) => {
    const questionText = `[${sheet}] ${row[0]} の ${headers[colIndex]} は？`;

    const otherChoicesRaw = allData
      .filter(q => q.sheet === sheet)
      .flatMap(q => q.rows.map(r => r[colIndex]))
      .filter(v => v !== "" && v !== correctAnswerRaw);

    const uniqueShuffledRaw = shuffleArray([...new Set(otherChoicesRaw)]).slice(0, 3);
    const choicesRaw = shuffleArray([correctAnswerRaw, ...uniqueShuffledRaw]);
    const answerIndex = choicesRaw.indexOf(correctAnswerRaw);

    const formatValue = v => {
      if (sheet === "price" && typeof v === "number") {
        return `¥${v.toLocaleString('ja-JP')}`;
      }
      return v;
    };
    const choicesDisplay = choicesRaw.map(formatValue);

    quizList.push({
      questionText,
      choicesRaw,
      choicesDisplay,
      answerIndex
    });
    userAnswers.push(null);
  });
}

// ====== ▼ クイズ表示 ======
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

    const choicesDiv = document.createElement("div");
    choicesDiv.className = "choices";

    if (quizMode === "choice") {
      // 選択式
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
    } else if (quizMode === "input") {
      // 記述式
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "数字を入力";
      choicesDiv.appendChild(input);

      const submitBtn = document.createElement("button");
      submitBtn.textContent = "回答";
      submitBtn.onclick = () => {
        if (userAnswers[qIndex] !== null) return;

        const val = input.value.trim();
        const normalized = val.replace(/[^0-9]/g, "");
        const correctNormalized = quiz.choicesDisplay[quiz.answerIndex].toString().replace(/[^0-9]/g, "");

        const result = block.querySelector(".result");
        if (normalized === correctNormalized) {
          userAnswers[qIndex] = "correct";
          result.textContent = "✅ 正解！";
          result.style.color = "green";
        } else {
          userAnswers[qIndex] = "wrong";
          result.textContent = `❌ 不正解。正解は「${quiz.choicesDisplay[quiz.answerIndex]}」`;
          result.style.color = "red";
        }
      };
      choicesDiv.appendChild(submitBtn);
    }

    block.appendChild(choicesDiv);

    const resultDiv = document.createElement("div");
    resultDiv.className = "result";
    block.appendChild(resultDiv);

    container.appendChild(block);
  });
}

// ====== ▼ 採点処理 ======
document.getElementById("check-score").onclick = () => {
  correctCount = 0;
  userAnswers.forEach((answer, index) => {
    if (quizMode === "choice") {
      if (answer === quizList[index].answerIndex) correctCount++;
    } else if (quizMode === "input") {
      if (answer === "correct") correctCount++;
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

// ====== ▼ コメント取得 ======
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

// ====== ▼ 配列シャッフル ======
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
