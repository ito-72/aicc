// /api/getQuizMeta.js
import { GAS_URL } from "./config";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    // GASのmetaモードを呼び出し
    const response = await fetch(`${GAS_URL}?mode=meta`);
    const data = await response.json();

    res.status(200).json(data);
  } catch (err) {
    console.error("API Error:", err);
    res.status(500).send("❌ サーバーエラー");
  }
}
