let quizData = null;
let quizList = [];
let currentIndex = 0;
let correctCount = 0;
let selectedIndex = null;

// 正解数に応じたコメント
const comments = [
  { range: [0, 3], messages: ["次はもっと頑張ろう！", "ドンマイ！", "チャレンジあるのみ！"] },
  { range: [4, 6], messages: ["あと少し！", "惜しい！", "いい線いってる！"] },
  { range: [7, 9], messages: ["お見事！", "素晴らしい！", "もうちょっとで満点！"] },
  { range: [10, 10], messages: ["満点！すごい！", "完璧！", "天才！"] }
];

document.getElementById("start-button").onclick = async () => {
  const startBtn = document.getElementById("start-button");
  startBtn.textContent = "作成中...";
  startBtn.disabled = true;

  try {
    const res = await fetch(CONFIG.GAS_URL);
    const data = await res.json();
    quizData = data;
    generateQuizList();
    currentIndex = 0;
    correctCount = 0;
    startBtn.style.display = "none";
    document.getElementById("question").style.display = "block";
    document.getElementById("answer").style.display = "inline-block";
    showQuiz();
  } catch (e) {
    document.getElementById("question").textContent = "データの取得に失敗しました。";
    console.error(e);
  }
};

function generateQuizList() {
  const headers = quizData[0];
  const rows = quizData.slice(1);
  quizList = [];

  for (let i = 0; i < 10; i++) {
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

    quizList.push({ questionText, choices, answerIndex });
  }
}

function showQuiz() {
  const quiz = quizList[currentIndex];
  selectedIndex = null;

  document.getElementById("result").textContent = "";
  document.getElementById("question").textContent = `第${currentIndex + 1}問：${quiz.questionText}`;

  const choicesDiv = document.getElementById("choices");
  choicesDiv.innerHTML = "";

  quiz.choices.forEach((choice, index) => {
    const btn = document.createElement("button");
    btn.textContent = `${choice}`;
    btn.className = "choice-button";
    btn.onclick = () => {
      selectedIndex = index;
      document.querySelectorAll(".choice-button").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
    };
    choicesDiv.appendChild(btn);
  });
}

document.getElementById("answer").onclick = () => {
  const quiz = quizList[currentIndex];
  const resultDiv = document.getElementById("result");

  if (selectedIndex === null) {
    resultDiv.textContent = "選択肢を選んでください。";
    resultDiv.style.color = "black";
    return;
  }

  if (selectedIndex === quiz.answerIndex) {
    resultDiv.textContent = "✅ 正解！";
    resultDiv.style.color = "green";
    correctCount++;
  } else {
    resultDiv.textContent = `❌ 不正解。正解は「${quiz.choices[quiz.answerIndex]}」`;
    resultDiv.style.color = "red";
  }

  currentIndex++;

  if (currentIndex < quizList.length) {
    setTimeout(showQuiz, 1000); // 次の問題へ
  } else {
    document.getElementById("answer").style.display = "none";
    document.getElementById("check-score").style.display = "inline-block";
  }
};

document.getElementById("check-score").onclick = () => {
  const scoreDiv = document.getElementById("score");
  const comment = getComment(correctCount);
  scoreDiv.textContent = `✅ ${correctCount} / ${quizList.length} 正解！\n${comment}`;
  document.getElementById("check-score").style.display = "none";
};

function getComment(score) {
  for (const group of comments) {
    const [min, max] = group.range;
    if (score >= min && score <= max) {
      const randomIndex = Math.floor(Math.random() * group.messages.length);
      return group.messages[randomIndex];
    }
  }
  return "";
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
