// 会場名取得
async function fetchRooms() {
  const res = await fetch(`${GAS_URL}?mode=rooms`);
  return await res.json();
}

// メタ情報取得（シート名・ヘッダー）
async function fetchQuizMeta() {
  const res = await fetch(`${GAS_URL}?mode=meta`);
  return await res.json();
}
