/** Show development-only auth/invite URLs in the UI (never in production builds). */
export function canShowDevAuthLinks() {
  return process.env.NODE_ENV === "development";
}
