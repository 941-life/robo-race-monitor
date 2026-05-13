/**
 * Environment-variable based config.
 * These values are baked into the Vercel/static build.
 */
export const config = {
  wsUrl:        process.env.NEXT_PUBLIC_WS_URL        ?? "",
  camUrl:       process.env.NEXT_PUBLIC_CAM_URL       ?? "",
  apiUrl:       process.env.NEXT_PUBLIC_API_URL       ?? "",
  gatewayToken: process.env.NEXT_PUBLIC_GATEWAY_TOKEN ?? "",
};
