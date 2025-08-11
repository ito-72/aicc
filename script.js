let quizData = null;
let quizList = [];
let userAnswers = [];
let correctCount = 0;

const comments = [
  { range: [0, 3], messages: ["次はもっと頑張ろう！", "ドンマイ！", "チャレンジあるのみ！"] },
  { range: [4, 6], messages: ["あと少し！", "惜しい！", "いい線いってる！"] },
  { range: [7, 9], messages: ["お見事！", "素晴らしい！", "もうちょっとで満点！"] },
  { range: [10, 10], messages: ["満点！すごい！", "完璧！", "天才！"] }
];

// 🔽 追加：同じジャンルで再出題
function resetSameQuiz() {
  userAnswers = [];
  correctCount = 0;
  generateQuizList(); // 同じジャンルの新しい出題
  renderAllQuizzes();
  document.getElementById("score").textContent = "";
  document.getElementById("check-score").style.display = "inline-block";
}

// 🔽 追加：最初の画面に戻る
function goBackToStart() {
  document.getElementById("quiz-container").style.display = "none";
  document.getElementById("check-score").style.display = "none";
  document.getElementById("score").textContent = "";
  document.getElementById("start-button").style.display = "inline-block";
  document.getElementById("start-button").textContent = "問題を作成する";
  document.getElementById("start-button").disabled = false;
}

document.getElementById("start-button").onclick = async () => {
  const startBtn = document.getElementById("start-button");
  startBtn.textContent = "作成中...";
  startBtn.disabled = true;

  try {
    const res = await fetch(CONFIG.GAS_URL);
    const data = await res.json();
    quizData = data;
    generateQuizList();
    renderAllQuizzes();
    startBtn.style.display = "none";
    document.getElementById("quiz-container").style.display = "block";
    document.getElementById("check-score").style.display = "inline-block";
  } catch (e) {
    console.error("データの取得に失敗しました。", e);
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
    userAnswers.push(null); // 初期状態
  }
}

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

    quiz.choices.forEach((choice, cIndex) => {
      const btn = document.createElement("button");
      btn.textContent = `${choice}`;
      btn.className = "choice-button";
      btn.onclick = () => {
        if (userAnswers[qIndex] !== null) return; // 一度だけ回答可能

        userAnswers[qIndex] = cIndex;

        // ボタン状態変更
        choicesDiv.querySelectorAll("button").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");

        // 結果表示
        const result = block.querySelector(".result");
        if (cIndex === quiz.answerIndex) {
          result.textContent = "✅ 正解！";
          result.style.color = "green";
        } else {
          result.textContent = `❌ 不正解。正解は「${quiz.choices[quiz.answerIndex]}」`;
          result.style.color = "red";
        }
      };
      choicesDiv.appendChild(btn);
    });

    block.appendChild(choicesDiv);

    const resultDiv = document.createElement("div");
    resultDiv.className = "result";
    block.appendChild(resultDiv);

    container.appendChild(block);
  });
}

document.getElementById("check-score").onclick = () => {
  correctCount = 0;
  userAnswers.forEach((answer, index) => {
    if (answer === quizList[index].answerIndex) {
      correctCount++;
    }
  });

  const comment = getComment(correctCount);
  const scoreDiv = document.getElementById("score");
  scoreDiv.textContent = `✅ ${correctCount} / ${quizList.length} 正解！\n${comment}`;
  document.getElementById("check-score").style.display = "none";

  // --- ボタン追加 ---
  const retryBtn = document.createElement("button");
  retryBtn.textContent = "もう一度";
  retryBtn.className = "action-button"; // ← CSSでデザイン統一
  retryBtn.onclick = resetSameQuiz;

  const otherQuizBtn = document.createElement("button");
  otherQuizBtn.textContent = "別のクイズ";
  otherQuizBtn.className = "action-button";
  otherQuizBtn.style.marginLeft = "10px";
  otherQuizBtn.onclick = goBackToStart;

  scoreDiv.appendChild(document.createElement("br"));
  scoreDiv.appendChild(retryBtn);
  scoreDiv.appendChild(otherQuizBtn);
};

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

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
