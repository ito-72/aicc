let quizData = null;
let selectedIndex = null;

// ヘッダーに応じた単位を定義（必要に応じて追加）
const unitMap = {
  "㎡": "㎡",
  "天井高": "m"
};

async function loadQuizData() {
  try {
    const res = await fetch(CONFIG.GAS_URL);
    const data = await res.json(); // [[ヘッダー], [...], [...]]
    quizData = data;
    createQuestion();
  } catch (e) {
    document.getElementById("question").textContent = "データの取得に失敗しました。";
    console.error(e);
  }
}

function createQuestion() {
  const headers = quizData[0];
  const rows = quizData.slice(1);

  const rowIndex = Math.floor(Math.random() * rows.length);
  const colIndex = Math.floor(Math.random() * (headers.length - 1)) + 1;

  const selectedRow = rows[rowIndex];
  const correctAnswer = selectedRow[colIndex];
  const questionText = `${selectedRow[0]} の ${headers[colIndex]} は？`;

  const otherChoices = rows
    .map(r => r[colIndex])
    .filter(v => v !== "" && v !== correctAnswer);

  const uniqueShuffled = shuffleArray([...new Set(otherChoices)]).slice(0, 3);
  const choices = shuffleArray([correctAnswer, ...uniqueShuffled]);
  const answerIndex = choices.indexOf(correctAnswer);

  renderQuiz({ questionText, choices, answerIndex, unit: unitMap[headers[colIndex]] || "" });
}

function renderQuiz({ questionText, choices, answerIndex, unit }) {
  document.getElementById("question").textContent = questionText;
  const choicesDiv = document.getElementById("choices");
  choicesDiv.innerHTML = "";

  selectedIndex = null;

  choices.forEach((choice, index) => {
    const btn = document.createElement("button");
    btn.textContent = unit ? `${choice} ${unit}` : `${choice}`;
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
      resultDiv.textContent = `❌ 不正解。正解は「${choices[answerIndex]}${unit ? ` ${unit}` : ""}」`;
      resultDiv.style.color = "red";
    }
  };
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

loadQuizData();
