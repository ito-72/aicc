import { CONFIG } from '../config.js';

export default async function handler(req, res) {
  const sheetName = req.query.sheetName;
  if (!sheetName) {
    return res.status(400).json({ error: 'sheetName parameter is required' });
  }

  try {
    const response = await fetch(`${CONFIG.GAS_URL}?mode=getHeaders&sheetName=${encodeURIComponent(sheetName)}`);
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('getHeaders error:', error);
    res.status(500).json({ error: 'Failed to fetch headers' });
  }
}
