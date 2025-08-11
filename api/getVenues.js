import { CONFIG } from '../config.js';

export default async function handler(req, res) {
  try {
    const response = await fetch(`${CONFIG.GAS_URL}?mode=getVenueNames`);
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('getVenues error:', error);
    res.status(500).json({ error: 'Failed to fetch venues' });
  }
}
