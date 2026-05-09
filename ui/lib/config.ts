/**
 * Environment-variable based config.
 * Set in .env.local for local dev (mock server).
 * Leave empty on Vercel → settings page localStorage takes over.
 */
export const config = {
  wsUrl:  process.env.NEXT_PUBLIC_WS_URL  ?? "",
  camUrl: process.env.NEXT_PUBLIC_CAM_URL ?? "",
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "",
};
