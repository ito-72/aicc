// ====== 問題リスト生成（Access・tools・fee_tools 分岐を含む） ======
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
  // Access は独自ロジック
  if (selectedSheets.includes("access")) {
    generateAccessQuiz();
    return;
  }

  // ▼ 通常（rooms / price / layout …）
  const candidates = [];
  quizData.forEach(({ sheet, headers, rows }) => {
    rows.forEach(row => {
      // 会場フィルタ
      if (selectedRooms.length && !isRoomSelected(row[0])) return;

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

// ====== Access（駐車場）専用 ======
function generateAccessQuiz() {
  const access = quizData.find(q => q.sheet === "access");
  if (!access) return;

  const { headers, rows } = access;
  const tmpList = [];

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

  // 1) 営業時間（開始・終了のダブル4択）
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

  // 2) 収容台数
  const capRow = findRowByLabel("収容台数は？");
  if (capRow) {
    const correctNum = toNumeric(capRow[1]);
    if (correctNum !== null) {
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

  // 3) 駐車料金（30分）… ¥表記
  const feeRow = findRowByLabel("駐車料金は？（30分）");
  if (feeRow) {
    const correctNum = toNumeric(feeRow[1]);
    if (correctNum !== null) {
      const wrongs = [];
      let step = 50;
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

  // 4) 機械式・平面式・搬入出・入口（ヘッダーとリンク）
  const headerRow = access.headers; // 先頭行
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
        const otherValues = targetRows
          .map(rr => rr[col])
          .filter(v => v !== "" && v !== null && v !== undefined && String(v) !== String(val));

        let wrongs = [...new Set(otherValues.map(v => toNumeric(v) ?? v))];

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

  quizList = shuffleArray(tmpList).slice(0, Math.min(quizCount, tmpList.length));
  userAnswers = new Array(quizList.length).fill(null);
}

// ====== 無料付帯（tools） ======
function generateToolsQuiz() {
  const tools = quizData.find(q => q.sheet === "tools");
  if (!tools) return;

  const { headers, rows } = tools;
  const targetRows = selectedRooms.length ? rows.filter(r => isRoomSelected(r[0])) : rows;
  const tmpList = [];

  // 1) ワイヤレスハンドマイク（D列固定）
  targetRows.forEach(row => {
    const roomName = row[0];
    const handMic = row[3];
    if (handMic) {
      const choices = ["B帯", "赤外線", "グースネック", "A帯"];
      const answerIndex = choices.indexOf(handMic);
      if (answerIndex >= 0) {
        tmpList.push({
          type: "choice",
          questionText: `${roomName} の ワイヤレスハンドマイクの種類は？`,
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

// ====== 有料備品（fee_tools） ======
function formatDisplayForFeeTools(colIndex, v) {
  const num = toNumeric(v);
  if (num === null) return String(v);
  if (colIndex === 1) return `¥${num.toLocaleString("ja-JP")}`; // B列のみ¥
  return String(num);
}

function generateFeeToolsQuiz() {
  const candidates = [];
  const fee = quizData.find(q => q.sheet === "fee_tools");
  if (!fee) {
    quizList = [];
    userAnswers = [];
    return;
  }
  const { headers, rows } = fee;

  rows.forEach(row => {
    const label = row[0];
    if (!label) return;

    // B列（価格）優先で4択
    if (headers[1] && row[1] !== "" && row[1] !== null && row[1] !== undefined) {
      const correctRaw = row[1];
      const correctNum = toNumeric(correctRaw);
      const otherValues = rows.map(r => r[1]).filter(v => v !== "" && v !== null && v !== undefined && String(v) !== String(correctRaw));
      let wrongs = [...new Set(otherValues)];

      if (wrongs.length < 3 && correctNum !== null) {
        let step = Math.max(100, Math.round(correctNum * 0.05)); // 5%程度
        let k = 1;
        while (wrongs.length < 3 && k <= 8) {
          [correctNum - step * k, correctNum + step * k].forEach(v => {
            if (v > 0 && !wrongs.includes(v) && v !== correctNum && wrongs.length < 3) wrongs.push(v);
          });
          k++;
        }
      }
      if (wrongs.length >= 3) {
        const choicesRaw = shuffleArray([correctRaw, ...shuffleArray(wrongs).slice(0, 3)]);
        const answerIndex = choicesRaw.findIndex(v => String(v) === String(correctRaw));
        const choicesDisplay = choicesRaw.map(v => formatDisplayForFeeTools(1, v));

        candidates.push({
          type: "choice",
          sheet: "fee_tools",
          questionText: `${label} の 価格は？`,
          choicesRaw,
          choicesDisplay,
          answerIndex
        });
      }
    }
  });

  const maxCount = Math.min(quizCount, candidates.length);
  quizList = shuffleArray(candidates).slice(0, maxCount);
  userAnswers = new Array(quizList.length).fill(null);
}

// ====== クイズ描画（double-choice対応） ======
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
      // 営業時間専用：開始・終了の2段4択
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
