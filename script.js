let quizData = null;
let selectedIndex = null;

async function loadQuizData() {
  try {
    const res = await fetch(CONFIG.GAS_URL);
    const data = await res.json(); // ← [[ヘッダー], [...], [...]]
    quizData = data;
    createQuestion();
  } catch (e) {
    document.getElementById("question").textContent = "データの取得に失敗しました。";
    console.error(e);
  }
}

function createQuestion() {
  const headers = quizData[0];          // ヘッダー行
  const rows = quizData.slice(1);       // データ行

  // ランダムに行と列を選ぶ（列は1列目以降＝項目）
  const rowIndex = Math.floor(Math.random() * rows.length);
  const colIndex = Math.floor(Math.random() * (headers.length - 1)) + 1;

  const selectedRow = rows[rowIndex];
  const correctAnswer = selectedRow[colIndex];
  const questionText = `${selectedRow[0]} の ${headers[colIndex]} は？`;

  // 他の行から同じ列の値を選択肢として集める
  const otherChoices = rows
    .map(r => r[colIndex])
    .filter(v => v !== "" && v !== correctAnswer);

  // 重複除去・シャッフル
  const uniqueShuffled = shuffleArray([...new Set(otherChoices)]).slice(0, 3);
  const choices = shuffleArray([correctAnswer, ...uniqueShuffled]);
  const answerIndex = choices.indexOf(correctAnswer);

  renderQuiz({ questionText, choices, answerIndex });
}

function renderQuiz({ questionText, choices, answerIndex }) {
  document.getElementById("question").textContent = questionText;
  const choicesDiv = document.getElementById("choices");
  choicesDiv.innerHTML = "";

  selectedIndex = null;

  choices.forEach((choice, index) => {
    const btn = document.createElement("button");
    btn.textContent = choice + (typeof choice === "number" ? " m" : "");
    btn.className = "choice-button";
    btn.onclick = () => {
      selectedIndex = index;
      document.querySelectorAll(".choice-button").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
    };
    choicesDiv.appendChild(btn);
  });

  document.getElementById("answer").onclick = () => {
    const resultDiv = document.getElementById("result");

    if (selectedIndex === null) {
      resultDiv.textContent = "選択肢を選んでください。";
      resultDiv.style.color = "black";
      return;
    }

    if (selectedIndex === answerIndex) {
      resultDiv.textContent = "✅ 正解！";
      resultDiv.style.color = "green";
    } else {
      resultDiv.textContent = `❌ 不正解。正解は「${choices[answerIndex]}」`;
      resultDiv.style.color = "red";
    }
  };
}

// シャッフル関数
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// 起動時に読み込み
loadQuizData();
