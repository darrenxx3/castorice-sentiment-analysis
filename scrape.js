const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto("https://www.hoyolab.com/article/37996979", {
    waitUntil: "networkidle2",
    timeout: 0
  });

  // Scroll to load all comments
  let prevHeight = 0;
  while (true) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(resolve => setTimeout(resolve, 1500));
    const currHeight = await page.evaluate(() => document.body.scrollHeight);
    if (currHeight === prevHeight) break;
    prevHeight = currHeight;
  }

  // Extract comments
  const comments = await page.evaluate(() => {
    const items = document.querySelectorAll('.mhy-reply-list > div');
    return Array.from(items).map(el => {
      const raw = el.getAttribute('data-local-cache');
      if (!raw) return { user: 'Unknown', comment: 'No data' };
      try {
        const parsed = JSON.parse(raw);
        return {
          user: parsed.nickname || 'Unknown',
          comment: parsed.xpostContent || 'No comment'
        };
      } catch (e) {
        return { user: 'Unknown', comment: 'Failed to parse' };
      }
    });
  });

  fs.writeFileSync('hoyolab_comments.json', JSON.stringify(comments, null, 2));
  console.log(`Scraped ${comments.length} comments.`);
  await browser.close();
})();
