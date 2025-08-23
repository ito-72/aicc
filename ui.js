// ====== アコーディオン ======
function initAccordions() {
  document.querySelectorAll(".section-title").forEach(title => {
    title.addEventListener("click", () => {
      const targetId = title.dataset.target;
      const target = document.getElementById(targetId);
      const isOpen = target && target.style.display === "flex";
      if (!target) return;
      target.style.display = isOpen ? "none" : "flex";
      title.classList.toggle("open", !isOpen);
    });
  });

  // 初期状態はすべて閉じる（index.html で display:none 指定済み）
  document.querySelectorAll(".tab-group").forEach(g => {
    if (g.style.display === "") g.style.display = "none";
  });
}

// ====== サマリー表示ユーティリティ ======
function setSummaryText(sectionId, values) {
  const title = document.querySelector(`.section-title[data-target="${sectionId}"]`);
  if (!title) return;
  const span = title.querySelector(".selected-summary");
  if (!span) return;
  span.textContent = Array.isArray(values) ? values.join("・") : String(values ?? "");
}

function getSelectedSheetLabels() {
  const labels = [];
  document.querySelectorAll("#sheet-tabs .tab.active").forEach(btn => {
    labels.push(btn.textContent.trim());
  });
  return labels;
}
function getSelectedHeaderLabels() {
  const list = [];
  Object.entries(selectedHeaders).forEach(([sheet, headers]) => {
    if (Array.isArray(headers)) list.push(...headers);
  });
  return list;
}
function refreshAllSummaries() {
  setSummaryText("sheet-tabs", getSelectedSheetLabels());
  setSummaryText("header-tabs", getSelectedHeaderLabels());
  setSummaryText("room-tabs", selectedRooms);
  setSummaryText("quiz-count-tabs", [`${quizCount}問`]);
  setSummaryText("quiz-mode-tabs", [quizMode === "choice" ? "選択" : "記述"]);
}

// ====== タブ初期化（カテゴリ/項目/会場/出題数/出題形式） ======
function initSheetTabs() {
  const sheetTabs = document.querySelectorAll("#sheet-tabs .tab");
  sheetTabs.forEach(tab => {
    tab.addEventListener("click", async () => {
      const sheet = tab.dataset.sheet;

      // toggle active
      if (selectedSheets.includes(sheet)) {
        selectedSheets = selectedSheets.filter(s => s !== sheet);
        tab.classList.remove("active");
        delete selectedHeaders[sheet];
      } else {
        selectedSheets.push(sheet);
        tab.classList.add("active");
        // toolsは項目タブ不要。それ以外はヘッダーをロード
        if (sheet !== "tools") {
          await loadHeadersForSheet(sheet);
        }
      }

      // サマリー更新（カテゴリ／項目）
      setSummaryText("sheet-tabs", getSelectedSheetLabels());
      setSummaryText("header-tabs", getSelectedHeaderLabels());
    });
  });
}

// ▼ ここをローディング表示対応
async function loadHeadersForSheet(sheetName) {
  const loadingEl = document.getElementById("loading");
  try {
    if (loadingEl) loadingEl.style.display = "block";  // 表示

    const res = await fetch(`${CONFIG.GAS_URL}?sheet=${encodeURIComponent(sheetName)}`);
    const data = await res.json();
    const headers = data[0].slice(1); // A列はラベル／会場名なのでB列以降

    const container = document.getElementById("header-tabs");
    // 既存の同シート分を削除（重複生成防止）
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
        // サマリー更新（項目）
        setSummaryText("header-tabs", getSelectedHeaderLabels());
      });

      container.appendChild(btn);
    });
  } catch (e) {
    console.error("ヘッダー取得に失敗", e);
  } finally {
    if (loadingEl) loadingEl.style.display = "none";  // 非表示
  }
}

async function initRoomTabs() {
  try {
    const res = await fetch(`${CONFIG.GAS_URL}?sheet=rooms`);
    const data = await res.json();
    const rows = data.slice(1);

    // ★必ず String 化してから trim
    const roomNames = rows
      .map(r => String(r[0]).trim())
      .filter(v => v !== "");

    const container = document.getElementById("room-tabs");
    container.innerHTML = "";

    // --- グループ選択ボタン（先頭に表示） ---
    const groups = ["3階", "200㎡まで", "全て"];
    groups.forEach(label => {
      const gbtn = document.createElement("button");
      gbtn.className = "tab";
      gbtn.textContent = label;
      gbtn.dataset.group = label;
      gbtn.addEventListener("click", () => {
        if (ROOM_GROUPS[label] === "ALL") {
          // 全て
          selectedRooms = [...roomNames];
        } else {
          // ★String 比較（roomNames は正規化済）
          const allowed = ROOM_GROUPS[label];
          selectedRooms = allowed.filter(n => roomNames.includes(String(n).trim()));
        }
        updateRoomButtons(container, roomNames);
        setSummaryText("room-tabs", selectedRooms);
      });
      container.appendChild(gbtn);
    });

    // --- 実際の会場ボタン（data-room にも String を入れる） ---
    roomNames.forEach(room => {
      const btn = document.createElement("button");
      btn.className = "tab";
      btn.textContent = room;
      btn.dataset.room = room; // 文字列
      btn.addEventListener("click", () => {
        if (selectedRooms.includes(room)) {
          selectedRooms = selectedRooms.filter(r => r !== room);
          btn.classList.remove("active");
        } else {
          selectedRooms.push(room);
          btn.classList.add("active");
        }
        setSummaryText("room-tabs", selectedRooms);
      });
      container.appendChild(btn);
    });

    updateRoomButtons(container, roomNames);
  } catch (e) {
    console.error("会場データ取得に失敗しました", e);
  }
}

function updateRoomButtons(container, roomNames) {
  // いったん全消し
  container.querySelectorAll('button[data-room]').forEach(b => b.classList.remove("active"));

  // ★selectedRooms も String 正規化して比較
  const selectedSet = new Set(selectedRooms.map(s => String(s).trim()));

  container.querySelectorAll('button[data-room]').forEach(b => {
    const name = String(b.dataset.room).trim();
    if (selectedSet.has(name)) b.classList.add("active");
  });
}

function initQuizCountTabs() {
  const countTabs = document.querySelectorAll("#quiz-count-tabs .tab");
  countTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      countTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      quizCount = parseInt(tab.dataset.count, 10);
      setSummaryText("quiz-count-tabs", [`${quizCount}問`]);
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
      setSummaryText("quiz-mode-tabs", [quizMode === "choice" ? "選択" : "記述"]);
    });
  });
}
