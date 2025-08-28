// ====== クイズ生成開始（ブランド別シート名で読み込み → 描画） ======
document.getElementById("start-button").onclick = async () => {
  if (selectedSheets.length === 0) {
    alert("少なくとも1つのシートを選んでください");
    return;
  }

  const loadingEl = document.getElementById("loading");

  try {
    if (loadingEl) loadingEl.style.display = "flex"; // トーストON

    let mergedData = [];
    let mergedAllData = [];

    for (const sheetKey of selectedSheets) {
      const effective = resolveSheetName(sheetKey); // 例: TACCなら T_price
      const res = await fetch(`${CONFIG.GAS_URL}?sheet=${encodeURIComponent(effective)}`);
      const data = await res.json();
      const headers = data[0];
      const rows = data.slice(1).filter(r => r[0] !== ""); // A列空の行は除外

      // 出題ロジック互換のため、sheet はブランド非依存キーを保持
      mergedData.push({ sheet: sheetKey, headers, rows });
      mergedAllData.push({ sheet: sheetKey, headers, rows });
    }

    quizData = mergedData;
    allData = mergedAllData;

    // 既存ロジックで問題生成（quiz.js）
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
  } finally {
    if (loadingEl) loadingEl.style.display = "none"; // トーストOFF
  }
};

// ====== 採点 ======
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

// ====== 右下ロゴ → 画像ビュー ======
const logoBar = document.getElementById("logo-bar");
const imageViewer = document.getElementById("image-viewer");
const backButton = document.getElementById("back-button");

if (logoBar && imageViewer && backButton) {
  logoBar.addEventListener("click", () => {
    // ▼ ここでブランドに応じて画像切替（AICC=2.png、TACC=3.jpg）
    const img = imageViewer.querySelector("img");
    if (img) {
      img.src = (typeof brand !== "undefined" && brand === "TACC") ? "3.jpg" : "2.png";
    }
    imageViewer.classList.add("active");
    imageViewer.style.display = "flex";
  });

  backButton.addEventListener("click", () => {
    imageViewer.classList.add("closing");
    setTimeout(() => {
      imageViewer.classList.remove("active", "closing");
      imageViewer.style.display = "none";
    }, 350);
  });
}
