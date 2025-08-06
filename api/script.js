// config.jsが先に読み込まれている前提

let quiz = null;
let selectedIndex = null;

async function loadQuiz() {
  try {
    const res = await fetch(CONFIG.GAS_URL);
    const data = await res.json();
    quiz = data;
    renderQuiz();
  } catch (e) {
    document.getElementById("question").textContent = "問題の取得に失敗しました。";
    console.error(e);
  }
}

function renderQuiz() {
  document.getElementById("question").textContent = quiz.question;

  const choicesDiv = document.getElementById("choices");
  choicesDiv.innerHTML = "";

  quiz.choices.forEach((choice, index) => {
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
}

document.getElementById("answer").onclick = () => {
  const resultDiv = document.getElementById("result");

  if (selectedIndex === null) {
    resultDiv.textContent = "選択肢を選んでください。";
    resultDiv.style.color = "black";
    return;
  }

  if (selectedIndex === quiz.answerIndex) {
    resultDiv.textContent = "✅ 正解！";
    resultDiv.style.color = "green";
  } else {
    resultDiv.textContent = `❌ 不正解。正解は「${quiz.choices[quiz.answerIndex]}」`;
    resultDiv.style.color = "red";
  }
};

loadQuiz();
