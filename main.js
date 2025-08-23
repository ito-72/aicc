// ====== 初期化 ======
window.addEventListener("DOMContentLoaded", () => {
  initAccordions();
  initSheetTabs();      // 階層1
  initRoomTabs();       // 階層3（グループボタン含む）
  initQuizCountTabs();  // 階層4
  initQuizModeTabs();   // 階層5
  refreshAllSummaries();
});

// ====== クイズ生成開始（シート読み込み→描画） ======
document.getElementById("start-button").onclick = async () => {
  if (selectedSheets.length === 0) {
    alert("少なくとも1つのシートを選んでください");
    return;
  }

  const loadingEl = document.getElementById("loading");

  try {
    if (loadingEl) loadingEl.style.display = "flex";   // トースト表示ON

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
  } finally {
    if (loadingEl) loadingEl.style.display = "none";  // トースト表示OFF
  }
};

// ====== 採点処理 ======
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

// ====== ロゴクリックで写真ビュー表示 ======
const logoBar = document.getElementById("logo-bar");
const imageViewer = document.getElementById("image-viewer");
const backButton = document.getElementById("back-button");

if (logoBar && imageViewer && backButton) {
  logoBar.addEventListener("click", () => {
    imageViewer.classList.add("active");
    imageViewer.style.display = "flex";
  });

  backButton.addEventListener("click", () => {
    // アニメーションで閉じる
    imageViewer.classList.add("closing");
    setTimeout(() => {
      imageViewer.classList.remove("active", "closing");
      imageViewer.style.display = "none";
    }, 350);
  });
}

// ====== ピンチズーム初期化 ======
function initPinchZoom() {
  const stage = document.getElementById("pinch-stage");
  const img = document.getElementById("pinch-img");
  if (!stage || !img) return;

  let scale = 1, minScale = 1, maxScale = 4;
  let startDist = 0;
  let startScale = 1;
  let translateX = 0, translateY = 0;
  let startX = 0, startY = 0;
  let lastTap = 0;

  const applyTransform = () => {
    img.style.transform = `translate(calc(-50% + ${translateX}px), calc(-50% + ${translateY}px)) scale(${scale})`;
  };

  const getDistance = (t1, t2) => {
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    return Math.hypot(dx, dy);
  };

  const clampPan = () => {
    const rect = stage.getBoundingClientRect();
    const imgW = img.naturalWidth * scale;
    const imgH = img.naturalHeight * scale;
    const maxX = Math.max(0, (imgW - rect.width) / 2);
    const maxY = Math.max(0, (imgH - rect.height) / 2);
    translateX = Math.min(maxX, Math.max(-maxX, translateX));
    translateY = Math.min(maxY, Math.max(-maxY, translateY));
  };

  stage.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      startDist = getDistance(e.touches[0], e.touches[1]);
      startScale = scale;
    } else if (e.touches.length === 1) {
      startX = e.touches[0].clientX - translateX;
      startY = e.touches[0].clientY - translateY;

      const now = Date.now();
      if (now - lastTap < 300) {
        if (scale > 1) {
          scale = 1; translateX = 0; translateY = 0;
        } else {
          scale = 2;
        }
        clampPan();
        applyTransform();
      }
      lastTap = now;
    }
  }, { passive: true });

  stage.addEventListener("touchmove", (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = getDistance(e.touches[0], e.touches[1]);
      if (startDist > 0) {
        let next = (dist / startDist) * startScale;
        next = Math.max(minScale, Math.min(maxScale, next));
        scale = next;
        clampPan();
        applyTransform();
      }
    } else if (e.touches.length === 1 && scale > 1) {
      e.preventDefault();
      translateX = e.touches[0].clientX - startX;
      translateY = e.touches[0].clientY - startY;
      clampPan();
      applyTransform();
    }
  }, { passive: false });

  // マウス対応（PC用ドラッグ）
  let isDragging = false;
  stage.addEventListener("mousedown", (e) => {
    if (scale <= 1) return;
    isDragging = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
  });
  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    clampPan();
    applyTransform();
  });
  document.addEventListener("mouseup", () => { isDragging = false; });

  const reset = () => {
    scale = 1; translateX = 0; translateY = 0; applyTransform();
  };
  reset();

  const back = document.getElementById("back-button");
  if (back) back.addEventListener("click", reset);
}

if (document.getElementById("image-viewer")) {
  initPinchZoom();
}
