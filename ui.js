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

  // 初期は閉じる
  document.querySelectorAll(".tab-group").forEach(g => {
    if (g.style.display === "") g.style.display = "none";
  });

  // 使い勝手向上：最初はブランド/カテゴリを見せておく
  const brandGrp = document.getElementById("brand-tabs");
  const sheetGrp = document.getElementById("sheet-tabs");
  if (brandGrp) brandGrp.style.display = "flex";
  if (sheetGrp) sheetGrp.style.display = "flex";
}

// ====== サマリー表示 ======
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
  setSummaryText("brand-tabs", [brand]);
  setSummaryText("sheet-tabs", getSelectedSheetLabels());
  setSummaryText("header-tabs", getSelectedHeaderLabels());
  setSummaryText("room-tabs", selectedRooms);
  setSummaryText("quiz-count-tabs", [`${quizCount}問`]);
  setSummaryText("quiz-mode-tabs", [quizMode === "choice" ? "選択" : "記述"]);
}

// ====== ブランド切替（階層0） ======
function initBrandTabs() {
  const tabs = document.querySelectorAll('#brand-tabs .tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', async () => {
      // タブ見た目
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // 値更新
      brand = tab.dataset.brand || 'AICC';

      // UI & 選択状態リセット
      updateBrandUI();
      resetSelectionsForBrand();

      // ブランド依存データの再取得（会場）
      await initRoomTabs();

      // サマリーを即時更新（タイトル右が変わらない問題への対処）
      setSummaryText("brand-tabs", [brand]);
      refreshAllSummaries();

      // 切替後もカテゴリは見えているようにする
      const sheetGrp = document.getElementById("sheet-tabs");
      if (sheetGrp) sheetGrp.style.display = "flex";
      const brandGrp = document.getElementById("brand-tabs");
      if (brandGrp) brandGrp.style.display = "flex";
    });
  });
}

// ====== タブ初期化（カテゴリ/項目/会場/出題数/出題形式） ======
function initSheetTabs() {
  const sheetTabs = document.querySelectorAll("#sheet-tabs .tab");
  sheetTabs.forEach(tab => {
    // すでにハンドラが付いている場合の多重登録を回避
    if (tab.dataset._bound === "1") return;
    tab.dataset._bound = "1";

    tab.addEventListener("click", async () => {
      const sheet = tab.dataset.sheet; // rooms/price/layout/tools/fee_tools/access

      // toggle active
      if (selectedSheets.includes(sheet)) {
        selectedSheets = selectedSheets.filter(s => s !== sheet);
        tab.classList.remove("active");
        delete selectedHeaders[sheet];
      } else {
        selectedSheets.push(sheet);
        tab.classList.add("active");
        // toolsは項目タブ不要。それ以外はヘッダー読み込み
        if (sheet !== "tools") {
          await loadHeadersForSheet(sheet);
          // ヘッダーのコンテナを開く
          const headerGrp = document.getElementById("header-tabs");
          if (headerGrp) headerGrp.style.display = "flex";
        }
      }

      setSummaryText("sheet-tabs", getSelectedSheetLabels());
      setSummaryText("header-tabs", getSelectedHeaderLabels());
    });
  });
}

// ▼ ブランド別シート名でヘッダー読込
async function loadHeadersForSheet(sheetKey) {
  const loadingEl = document.getElementById("loading");
  try {
    if (loadingEl) loadingEl.style.display = "block";

    const effective = resolveSheetName(sheetKey); // 例: TACC → T_rooms
    const res = await fetch(`${CONFIG.GAS_URL}?sheet=${encodeURIComponent(effective)}`);
    const data = await res.json();
    const headers = data[0].slice(1); // A列は会場名（見出し外す）

    const container = document.getElementById("header-tabs");
    // 同一sheetKeyの古いボタンは削除
    Array.from(container.querySelectorAll(`button[data-sheet="${sheetKey}"]`)).forEach(b => b.remove());

    headers.forEach(header => {
      const btn = document.createElement("button");
      btn.className = "tab";
      btn.textContent = header;
      btn.dataset.sheet = sheetKey; // ブランド非依存キー
      btn.dataset.header = header;

      btn.addEventListener("click", () => {
        if (!selectedHeaders[sheetKey]) selectedHeaders[sheetKey] = [];
        if (selectedHeaders[sheetKey].includes(header)) {
          selectedHeaders[sheetKey] = selectedHeaders[sheetKey].filter(h => h !== header);
          btn.classList.remove("active");
        } else {
          selectedHeaders[sheetKey].push(header);
          btn.classList.add("active");
        }
        setSummaryText("header-tabs", getSelectedHeaderLabels());
      });

      container.appendChild(btn);
    });
  } catch (e) {
    console.error("ヘッダー取得に失敗", e);
  } finally {
    if (loadingEl) loadingEl.style.display = "none";
  }
}

async function initRoomTabs() {
  try {
    const effectiveRooms = resolveSheetName('rooms');
    const res = await fetch(`${CONFIG.GAS_URL}?sheet=${encodeURIComponent(effectiveRooms)}`);
    const data = await res.json();
    const rows = data.slice(1);

    const roomNames = rows
      .map(r => String(r[0]).trim())
      .filter(v => v !== "");

    const container = document.getElementById("room-tabs");
    container.innerHTML = "";

    // グループボタン
    const groups = ["3階", "200㎡まで", "全て"];
    groups.forEach(label => {
      const gbtn = document.createElement("button");
      gbtn.className = "tab";
      gbtn.textContent = label;
      gbtn.dataset.group = label;
      gbtn.addEventListener("click", () => {
        if (ROOM_GROUPS[label] === "ALL") {
          selectedRooms = [...roomNames];
        } else {
          const allowed = ROOM_GROUPS[label];
          selectedRooms = allowed.filter(n => roomNames.includes(String(n).trim()));
        }
        updateRoomButtons(container, roomNames);
        setSummaryText("room-tabs", selectedRooms);
      });
      container.appendChild(gbtn);
    });

    // 会場ボタン
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
        setSummaryText("room-tabs", selectedRooms);
      });
      container.appendChild(btn);
    });

    updateRoomButtons(container, roomNames);

    // 切替後も会場タブを見えるように
    const roomGrp = document.getElementById("room-tabs");
    if (roomGrp) roomGrp.style.display = "flex";
  } catch (e) {
    console.error("会場データ取得に失敗しました", e);
  }
}

function updateRoomButtons(container, roomNames) {
  container.querySelectorAll('button[data-room]').forEach(b => b.classList.remove("active"));
  const selectedSet = new Set(selectedRooms.map(s => String(s).trim()));
  container.querySelectorAll('button[data-room]').forEach(b => {
    const name = String(b.dataset.room).trim();
    if (selectedSet.has(name)) b.classList.add("active");
  });
}

function initQuizCountTabs() {
  const countTabs = document.querySelectorAll("#quiz-count-tabs .tab");
  countTabs.forEach(tab => {
    if (tab.dataset._bound === "1") return;
    tab.dataset._bound = "1";

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
    if (tab.dataset._bound === "1") return;
    tab.dataset._bound = "1";

    tab.addEventListener("click", () => {
      modeTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      quizMode = tab.dataset.mode; // "choice" | "input"
      setSummaryText("quiz-mode-tabs", [quizMode === "choice" ? "選択" : "記述"]);
    });
  });
}

// ====== 初期化 ======
window.addEventListener('DOMContentLoaded', () => {
  initAccordions();
  initBrandTabs();       // 階層0
  initSheetTabs();       // 階層1（イベント一度だけ束ねる）
  initRoomTabs();        // 階層3（ブランド依存で毎回取得）
  initQuizCountTabs();   // 階層4
  initQuizModeTabs();    // 階層5
  updateBrandUI();
  refreshAllSummaries();
});
