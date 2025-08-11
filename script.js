let selectedVenues = [];
let selectedSheets = [];
let selectedHeaders = [];
let selectedMode = "select";

// 初期化処理
document.addEventListener("DOMContentLoaded", () => {
  loadVenues();
  loadSheets();
});

// 会場一覧取得
function loadVenues() {
  fetch(`/api/getVenues`)
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById("venue-container");
      container.innerHTML = "";
      data.forEach(name => {
        const id = `venue-${name}`;
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = id;
        checkbox.value = name;
        checkbox.addEventListener("change", updateSelectedVenues);

        const label = document.createElement("label");
        label.htmlFor = id;
        label.textContent = name;

        container.appendChild(checkbox);
        container.appendChild(label);
        container.appendChild(document.createElement("br"));
      });
    })
    .catch(err => console.error("会場取得エラー:", err));
}

function updateSelectedVenues() {
  selectedVenues = Array.from(document.querySelectorAll("#venue-container input:checked"))
    .map(cb => cb.value);
}

// シート名一覧取得
function loadSheets() {
  fetch(`/api/getSheets`)
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById("sheet-container");
      container.innerHTML = "";
      data.forEach(sheetName => {
        const id = `sheet-${sheetName}`;
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = id;
        checkbox.value = sheetName;
        checkbox.addEventListener("change", () => {
          updateSelectedSheets();
          loadHeadersForSelectedSheets();
        });

        const label = document.createElement("label");
        label.htmlFor = id;
        label.textContent = sheetName;

        container.appendChild(checkbox);
        container.appendChild(label);
        container.appendChild(document.createElement("br"));
      });
    })
    .catch(err => console.error("シート取得エラー:", err));
}

function updateSelectedSheets() {
  selectedSheets = Array.from(document.querySelectorAll("#sheet-container input:checked"))
    .map(cb => cb.value);
}

// 選択されたシートのヘッダー取得
function loadHeadersForSelectedSheets() {
  const container = document.getElementById("header-container");
  container.innerHTML = "";
  selectedHeaders = [];

  selectedSheets.forEach(sheetName => {
    fetch(`/api/getHeaders?sheetName=${encodeURIComponent(sheetName)}`)
      .then(res => res.json())
      .then(headers => {
        headers.forEach(header => {
          const id = `header-${sheetName}-${header}`;
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.id = id;
          checkbox.value = `${sheetName}:${header}`;
          checkbox.addEventListener("change", updateSelectedHeaders);

          const label = document.createElement("label");
          label.htmlFor = id;
          label.textContent = `[${sheetName}] ${header}`;

          container.appendChild(checkbox);
          container.appendChild(label);
          container.appendChild(document.createElement("br"));
        });
      })
      .catch(err => console.error(`ヘッダー取得エラー(${sheetName}):`, err));
  });
}

function updateSelectedHeaders() {
  selectedHeaders = Array.from(document.querySelectorAll("#header-container input:checked"))
    .map(cb => cb.value);
}

// 出題形式選択
document.querySelectorAll("input[name='quizMode']").forEach(radio => {
  radio.addEventListener("change", e => {
    selectedMode = e.target.value;
  });
});

// 全選択ボタン
document.getElementById("select-all-venues").addEventListener("click", () => {
  document.querySelectorAll("#venue-container input[type='checkbox']`)
    .forEach(cb => cb.checked = true);
  updateSelectedVenues();
});

document.getElementById("select-all-sheets").addEventListener("click", () => {
  document.querySelectorAll("#sheet-container input[type='checkbox']`)
    .forEach(cb => cb.checked = true);
  updateSelectedSheets();
  loadHeadersForSelectedSheets();
});

document.getElementById("select-all-headers").addEventListener("click", () => {
  document.querySelectorAll("#header-container input[type='checkbox']`)
    .forEach(cb => cb.checked = true);
  updateSelectedHeaders();
});

// スタート（まだダミー）
document.getElementById("start-quiz").addEventListener("click", () => {
  console.log("会場:", selectedVenues);
  console.log("シート:", selectedSheets);
  console.log("項目:", selectedHeaders);
  console.log("形式:", selectedMode);
  alert("選択内容はコンソールに表示されました（仮）");
});
