// Use an installed Playwright package, or point PLAYWRIGHT_MODULE to a bundled one.
export const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
export const launchOptions = {
  headless: true,
  ...(process.env.PORTFOLIO_BROWSER ? {executablePath: process.env.PORTFOLIO_BROWSER} : {}),
};
export const base = process.env.PORTFOLIO_REVIEW_URL || 'http://127.0.0.1:4173';
