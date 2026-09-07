// Captures the template demos with a real Chromium so motion/whileInView content is rendered.
//
//   node scripts/shoot-demos.mjs                 -> public/demos/covers/<site>-<lang>.jpg (1440x900 fold)
//   node scripts/shoot-demos.mjs --full out/dir  -> full-page PNGs for visual review
//
// Env: BASE_URL (default http://localhost:3100), CHROME (path to chrome.exe; defaults to the
// Playwright-managed Chromium in %LOCALAPPDATA%/ms-playwright), SITES (comma list), LANGS.
import { mkdirSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { DEMO_LANGS, DEMO_SLUGS } from "../src/demos/config.ts";

const here = dirname(fileURLToPath(import.meta.url));
const BASE = (process.env.BASE_URL ?? "http://localhost:3100").replace(
  /\/$/,
  "",
);
// Follow the shared registry while keeping selective capture overrides.
const SITES = (process.env.SITES ?? DEMO_SLUGS.join(","))
  .split(",")
  .map((site) => site.trim())
  .filter(Boolean);
const LANGS = (process.env.LANGS ?? DEMO_LANGS.join(","))
  .split(",")
  .map((lang) => lang.trim())
  .filter(Boolean);
const full = process.argv.includes("--full");
const outDir = full
  ? (process.argv[process.argv.indexOf("--full") + 1] ??
    join(here, "../shots-demos"))
  : join(here, "../public/demos/covers");
mkdirSync(outDir, { recursive: true });

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const root = join(process.env.LOCALAPPDATA ?? "", "ms-playwright");
  if (!existsSync(root)) return undefined;
  const dir = readdirSync(root)
    .filter((d) => d.startsWith("chromium-"))
    .sort()
    .pop();
  if (!dir) return undefined;
  for (const sub of [
    "chrome-win64/chrome.exe",
    "chrome-win/chrome.exe",
    "chrome-linux/chrome",
  ]) {
    const p = join(root, dir, sub);
    if (existsSync(p)) return p;
  }
  return undefined;
}

const browser = await chromium.launch({ executablePath: findChrome() });
try {
  for (const site of SITES) {
    for (const lang of LANGS) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      });
      const url = `${BASE}/demos/${site}/${lang}`;
      await page.goto(url, { waitUntil: "networkidle" });
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      // Hide the floating DevsHub toolbar so covers show only the template.
      await page.addStyleTag({
        content: "[role=region][aria-label*='DevsHub'],nextjs-portal{display:none!important}",
      });
      if (full) {
        // Scroll through so every whileInView reveal has fired before capturing, and force
        // lazy images to load so the capture is not at the mercy of the loading heuristics.
        await page.evaluate(async () => {
          document
            .querySelectorAll("img[loading=lazy]")
            .forEach((img) => (img.loading = "eager"));
          const h = document.documentElement.scrollHeight;
          for (let y = 0; y < h; y += 500) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 90));
          }
          window.scrollTo(0, 0);
        });
        await page.evaluate(() =>
          Promise.all(
            [...document.images].map((img) =>
              img.decode().catch(() => undefined),
            ),
          ),
        );
        await page.waitForTimeout(600);
        await page.screenshot({
          path: join(outDir, `${site}-${lang}.png`),
          fullPage: true,
        });
      } else {
        await page.waitForTimeout(1200);
        await page.screenshot({
          path: join(outDir, `${site}-${lang}.jpg`),
          type: "jpeg",
          quality: 82,
        });
      }
      console.log("captured", site, lang);
      await page.close();
    }
  }
} finally {
  await browser.close();
}
