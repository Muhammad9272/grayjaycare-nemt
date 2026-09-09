import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const BASE_URL = (process.env.PORTFOLIO_BASE_URL || "https://grayjaycare.com").replace(/\/$/, "");
const PASSWORD = process.env.DEMO_PASSWORD || process.env.SEED_PASSWORD;
const OUTPUT_DIR = resolve(process.env.PORTFOLIO_OUTPUT_DIR || "artifacts/portfolio");
const SCREEN_DIR = join(OUTPUT_DIR, "screens");
const CLIP_DIR = join(OUTPUT_DIR, "clips");
const WORK_DIR = join(OUTPUT_DIR, "work");
const BACKGROUND = join(WORK_DIR, "brand-background.png");
const THUMBNAIL_ONLY = process.env.PORTFOLIO_THUMBNAIL_ONLY === "true";
const THUMBNAIL_4X3_ONLY = process.env.PORTFOLIO_THUMBNAIL_4X3_ONLY === "true";
const MUSIC = resolve(
  process.env.PORTFOLIO_MUSIC
    || join(homedir(), "Downloads", "ikoliks_aj-arabic-islamic-muslim-background-music-318228.mp3"),
);
const THUMBNAIL = join(OUTPUT_DIR, "Gray-Jay-Care-Fiverr-Portfolio-Thumbnail-1280x769.png");
const THUMBNAIL_4K = join(OUTPUT_DIR, "Gray-Jay-Care-Fiverr-Portfolio-Thumbnail-4K-3840x2307.png");
const THUMBNAIL_4K_JPG = join(OUTPUT_DIR, "Gray-Jay-Care-Fiverr-Portfolio-Thumbnail-4K-3840x2307.jpg");
const THUMBNAIL_4K_4X3 = join(OUTPUT_DIR, "Gray-Jay-Care-Fiverr-Portfolio-Thumbnail-4K-4x3-3840x2880.png");
const THUMBNAIL_4K_4X3_JPG = join(OUTPUT_DIR, "Gray-Jay-Care-Fiverr-Portfolio-Thumbnail-4K-4x3-3840x2880.jpg");
const RAW_VIDEO = join(CLIP_DIR, "Gray-Jay-Care-Portfolio-Walkthrough-raw.webm");
const FINAL_VIDEO = join(OUTPUT_DIR, "Gray-Jay-Care-Portfolio-Walkthrough-1080p.mp4");
const SUBTITLES = join(OUTPUT_DIR, "Gray-Jay-Care-Portfolio-Walkthrough-English.srt");
const MANIFEST = join(WORK_DIR, "walkthrough-demo-run.json");
const MUSIC_CREDIT = join(OUTPUT_DIR, "Pixabay-Music-Credit.txt");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const chromeUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36";

const isThumbnailOnlyRun = THUMBNAIL_ONLY || THUMBNAIL_4X3_ONLY;
if (!isThumbnailOnlyRun && !PASSWORD) throw new Error("DEMO_PASSWORD or SEED_PASSWORD is required.");
for (const path of isThumbnailOnlyRun ? [BACKGROUND] : [BACKGROUND, MUSIC]) {
  if (!existsSync(path)) throw new Error(`Required asset is missing: ${path}`);
}

const accounts = {
  admin: process.env.DEMO_ADMIN_EMAIL || "admin@grayjaycare.org",
  dispatcher: process.env.DEMO_DISPATCHER_EMAIL || "dispatcher@grayjaycare.ca",
  driver: process.env.DEMO_DRIVER_EMAIL || "driver@grayjaycare.ca",
  hospital: process.env.DEMO_HOSPITAL_EMAIL || "hospital@grayjaycare.ca",
};

const wait = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

function run(command, args, options = {}) {
  execFileSync(command, args, { stdio: "inherit", ...options });
}

function duration(path) {
  return Number(execFileSync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path,
  ], { encoding: "utf8" }).trim());
}

async function imageDataUrl(path) {
  const extension = path.endsWith(".jpg") || path.endsWith(".jpeg") ? "jpeg" : "png";
  return `data:image/${extension};base64,${(await readFile(path)).toString("base64")}`;
}

async function goto(page, path, heading) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (heading) {
    await page.getByRole("heading", { level: 1, name: heading }).waitFor({ state: "visible", timeout: 30_000 });
    // Hostinger may present a short browser check before returning the real
    // document. Wait for the Next.js scripts and hydration before interacting.
    await page.waitForFunction(() => document.querySelectorAll('script[src*="_next"]').length > 0, null, { timeout: 15_000 });
    await wait(900);
  }
}

async function login(page, email, expectedPath) {
  // Preserve Hostinger's browser-check cookie while clearing only app auth.
  await page.context().clearCookies({ name: /authjs|next-auth/i });
  await goto(page, "/login", /Sign in to your portal/);
  const emailInput = page.getByLabel("Email address");
  if (page.video()) {
    await emailInput.evaluate((input) => {
      input.style.color = "transparent";
      input.style.textShadow = "0 0 10px rgba(62,45,69,.8)";
    });
  }
  await emailInput.fill(email);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await page.waitForURL(new RegExp(expectedPath), { timeout: 30_000 });
  await page.locator("h1").first().waitFor({ state: "visible", timeout: 30_000 });
}

function futureDateParts(daysAhead = 8) {
  const date = new Date(Date.now() + daysAhead * 24 * 60 * 60_000);
  return {
    day: String(date.getUTCDate()).padStart(2, "0"),
    month: String(date.getUTCMonth() + 1).padStart(2, "0"),
    year: String(date.getUTCFullYear()),
    time: "10:30",
  };
}

async function fillLongDate(page, label, parts) {
  await page.getByLabel(`${label}: day`).selectOption(parts.day);
  await wait(250);
  await page.getByLabel(`${label}: month`).selectOption(parts.month);
  await wait(250);
  await page.getByLabel(`${label}: year`).selectOption(parts.year);
  await wait(250);
  await page.getByLabel(`${label}: time`).fill(parts.time);
  await wait(250);
}

async function prepareBookingQuote(page) {
  await goto(page, "/book", /Book a safe, caring ride/);
  await page.getByLabel("Pickup address").fill("339 Windermere Road, London, ON");
  await wait(400);
  await page.getByLabel("Drop-off address").fill("800 Commissioners Road East, London, ON");
  await wait(400);
  await fillLongDate(page, "Pickup date and time", futureDateParts());
  await page.locator('input[name="mobilityType"][value="WHEELCHAIR"]').check({ force: true });
  await page.getByText("Oxygen required", { exact: false }).first().click();
  try {
    await page.locator('[class*="estimatedTotal"]').waitFor({ state: "visible", timeout: 20_000 });
  } catch {
    const manualDistance = page.getByLabel("Estimated trip distance (km)");
    if (await manualDistance.count()) {
      await manualDistance.fill("8.5");
      await page.locator('[class*="estimatedTotal"]').waitFor({ state: "visible", timeout: 20_000 });
    } else {
      throw new Error("The live fare estimate did not appear.");
    }
  }
  await page.locator("form").evaluate((form) => form.scrollIntoView({ block: "start" }));
  await page.evaluate(() => window.scrollBy({ top: 210, behavior: "instant" }));
}

async function createDemoTrip(page, demo) {
  await login(page, accounts.dispatcher, "\\/dispatch");
  const response = await page.request.post(`${BASE_URL}/api/bookings`, {
    data: {
      pickupAddress: "339 Windermere Road, London, ON",
      pickupLat: 43.0127,
      pickupLng: -81.2759,
      pickupDepartment: "Main Lobby Discharge Desk",
      pickupRoom: "Room 214",
      dropoffAddress: "800 Commissioners Road East, London, ON",
      dropoffLat: 42.9599,
      dropoffLng: -81.2254,
      dropoffDepartment: "Medical Imaging",
      dropoffRoom: "Room B1-120",
      distanceKm: 8.5,
      waitMinutes: 15,
      mobilityType: "WHEELCHAIR",
      isBariatric: false,
      isOutOfCity: false,
      requiresOxygen: true,
      requiresIsolation: false,
      hasDnr: true,
      escortCount: 1,
      extraAttendant: false,
      extraAttendantHours: 0,
      scheduledAt: new Date(Date.now() + 8 * 24 * 60 * 60_000).toISOString(),
      pickupTimePreference: "SPECIFIC",
      returnTripType: "ONE_WAY",
      guestName: "Taylor Portfolio Patient",
      contactName: "Morgan Care Coordinator",
      guestEmail: demo.email,
      guestPhone: "5195550199",
      contactPhoneExtension: "214",
      medicalRecordNumber: `PORT-${String(Date.now()).slice(-6)}`,
      paymentPreference: "INVOICE",
      medicalDocumentsAvailable: true,
      notes: "Portfolio demonstration record. Main lobby pickup.",
      source: "PHONE",
    },
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok()) throw new Error(`Demo booking failed with HTTP ${response.status()}.`);
  const result = await response.json();
  demo.tripId = result.tripId;
  demo.referenceCode = result.referenceCode;
  await writeFile(MANIFEST, `${JSON.stringify({ ...demo, baseUrl: BASE_URL }, null, 2)}\n`, { mode: 0o600 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: demo.referenceCode, exact: true }).waitFor({ state: "visible" });
}

async function captureScreens(browser, demo) {
  const desktop = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    userAgent: chromeUserAgent,
    colorScheme: "light",
    locale: "en-CA",
    timezoneId: "America/Toronto",
    deviceScaleFactor: 1,
  });
  const page = await desktop.newPage();
  await goto(page, "/", /Safe Journeys/);
  await page.screenshot({ path: join(SCREEN_DIR, "01-landing-page.png") });

  await prepareBookingQuote(page);
  await page.screenshot({ path: join(SCREEN_DIR, "02-live-booking-calculator.png") });

  await login(page, accounts.dispatcher, "\\/dispatch");
  await page.getByRole("link", { name: demo.referenceCode, exact: true }).waitFor({ state: "visible" });
  await page.screenshot({ path: join(SCREEN_DIR, "03-dispatcher-board.png") });

  await login(page, accounts.admin, "\\/admin");
  await page.screenshot({ path: join(SCREEN_DIR, "04-admin-dashboard.png") });
  const verifiedState = await desktop.storageState();
  verifiedState.cookies = verifiedState.cookies.filter((cookie) => !/authjs|next-auth/i.test(cookie.name));
  await desktop.close();

  const mobile = await browser.newContext({
    viewport: { width: 430, height: 900 },
    userAgent: chromeUserAgent,
    colorScheme: "light",
    locale: "en-CA",
    timezoneId: "America/Toronto",
    deviceScaleFactor: 1,
  });
  const mobilePage = await mobile.newPage();
  await goto(mobilePage, "/", /Safe Journeys/);
  await mobilePage.screenshot({ path: join(SCREEN_DIR, "05-responsive-mobile.png") });
  await mobile.close();
  return verifiedState;
}

async function capturePublicScreensHiDpi(browser) {
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    userAgent: chromeUserAgent,
    colorScheme: "light",
    locale: "en-CA",
    timezoneId: "America/Toronto",
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await goto(page, "/", /Safe Journeys/);
  await page.screenshot({ path: join(SCREEN_DIR, "01-landing-page.png") });
  await prepareBookingQuote(page);
  await page.screenshot({ path: join(SCREEN_DIR, "02-live-booking-calculator.png") });
  await context.close();
}

function thumbnailHtml(images) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;width:1280px;height:769px;overflow:hidden;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff}
    body{background:#34123f url('${images.background}') center/cover no-repeat;position:relative}
    body:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(28,8,39,.74),rgba(42,13,58,.18) 56%,rgba(31,8,42,.42));z-index:0}
    .safe{position:absolute;inset:38px 46px;z-index:1}
    .top{display:flex;align-items:center;justify-content:space-between}
    .brand{display:flex;align-items:center;gap:12px;font-size:18px;font-weight:850;letter-spacing:.08em}.mark{width:38px;height:38px;display:grid;place-items:center;border-radius:12px;background:linear-gradient(145deg,#ff786e,#ff9d81);box-shadow:0 8px 22px rgba(255,109,98,.36);font-size:25px}
    .case{padding:9px 14px;border:1px solid rgba(255,255,255,.3);border-radius:999px;background:rgba(255,255,255,.12);font-size:12px;font-weight:800;letter-spacing:.12em}
    .copy{margin-top:34px;max-width:850px}.eyebrow{color:#ffc0e6;font-size:14px;font-weight:850;letter-spacing:.16em}.copy h1{margin:9px 0 0;font-family:Georgia,serif;font-size:60px;line-height:.98;font-weight:500;letter-spacing:-.035em}.copy p{margin:11px 0 0;color:#f0ddf6;font-size:19px;font-weight:650}
    .screens{position:absolute;left:0;right:0;bottom:0;height:418px}
    .frame{position:absolute;overflow:hidden;border:1px solid rgba(255,255,255,.45);border-radius:15px;background:#fff;box-shadow:0 22px 55px rgba(12,2,19,.46)}.frame:before{content:"";display:block;height:20px;background:linear-gradient(90deg,#f8f4fa,#eee5f3);border-bottom:1px solid #dfd5e4}.frame:after{content:"●  ●  ●";position:absolute;top:4px;left:10px;color:#c29acf;font-size:9px;letter-spacing:2px}.frame img{display:block;width:100%;height:calc(100% - 20px);object-fit:contain;background:#fff}
    .landing{left:0;bottom:0;width:650px;height:386px;transform:rotate(-1deg)}.booking{right:2px;top:0;width:505px;height:284px;transform:rotate(1.2deg)}.dispatch{right:28px;bottom:0;width:455px;height:256px;transform:rotate(-.6deg)}
    .chip{position:absolute;left:665px;bottom:24px;padding:10px 13px;border-radius:10px;background:#ff746b;color:#3a133e;font-size:12px;font-weight:900;box-shadow:0 10px 28px rgba(0,0,0,.3)}
  </style></head><body><div class="safe">
    <div class="top"><div class="brand"><span class="mark">✚</span>GRAY JAY CARE</div><div class="case">LIVE SaaS CASE STUDY</div></div>
    <div class="copy"><div class="eyebrow">FULL-STACK NEMT WEB PLATFORM</div><h1>Booking to dispatch.<br>One connected journey.</h1><p>UX/UI Design • Web Development • Role-Based Dashboards</p></div>
    <div class="screens"><div class="frame landing"><img src="${images.landing}"></div><div class="frame booking"><img src="${images.booking}"></div><div class="frame dispatch"><img src="${images.dispatch}"></div><div class="chip">REAL WORKING APPLICATION</div></div>
  </div></body></html>`;
}

function thumbnail4x3Html(images) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;width:1280px;height:960px;overflow:hidden;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff}
    body{background:#34123f url('${images.background}') center/cover no-repeat;position:relative}
    body:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(28,8,39,.76),rgba(42,13,58,.16) 56%,rgba(31,8,42,.42));z-index:0}
    .safe{position:absolute;inset:42px 50px;z-index:1}
    .top{display:flex;align-items:center;justify-content:space-between}
    .brand{display:flex;align-items:center;gap:12px;font-size:19px;font-weight:850;letter-spacing:.08em}.mark{width:40px;height:40px;display:grid;place-items:center;border-radius:12px;background:linear-gradient(145deg,#ff786e,#ff9d81);box-shadow:0 8px 22px rgba(255,109,98,.36);font-size:26px}
    .case{padding:10px 15px;border:1px solid rgba(255,255,255,.3);border-radius:999px;background:rgba(255,255,255,.12);font-size:12px;font-weight:800;letter-spacing:.12em}
    .copy{margin-top:39px;max-width:900px}.eyebrow{color:#ffc0e6;font-size:14px;font-weight:850;letter-spacing:.16em}.copy h1{margin:10px 0 0;font-family:Georgia,serif;font-size:68px;line-height:.98;font-weight:500;letter-spacing:-.035em}.copy p{margin:13px 0 0;color:#f0ddf6;font-size:20px;font-weight:650}
    .screens{position:absolute;left:0;right:0;bottom:0;height:570px}
    .frame{position:absolute;overflow:hidden;border:1px solid rgba(255,255,255,.45);border-radius:16px;background:#fff;box-shadow:0 24px 60px rgba(12,2,19,.5)}.frame:before{content:"";display:block;height:21px;background:linear-gradient(90deg,#f8f4fa,#eee5f3);border-bottom:1px solid #dfd5e4}.frame:after{content:"●  ●  ●";position:absolute;top:4px;left:11px;color:#c29acf;font-size:9px;letter-spacing:2px}.frame img{display:block;width:100%;height:calc(100% - 21px);object-fit:contain;background:#fff}
    .landing{left:0;bottom:0;width:720px;height:426px;transform:rotate(-1deg)}.booking{right:0;top:0;width:560px;height:336px;transform:rotate(1.2deg)}.dispatch{right:20px;bottom:0;width:520px;height:314px;transform:rotate(-.6deg)}
    .chip{position:absolute;left:654px;bottom:32px;padding:11px 15px;border-radius:10px;background:#ff746b;color:#3a133e;font-size:13px;font-weight:900;box-shadow:0 10px 28px rgba(0,0,0,.3)}
  </style></head><body><div class="safe">
    <div class="top"><div class="brand"><span class="mark">✚</span>GRAY JAY CARE</div><div class="case">LIVE SaaS CASE STUDY</div></div>
    <div class="copy"><div class="eyebrow">FULL-STACK NEMT WEB PLATFORM</div><h1>Booking to dispatch.<br>One connected journey.</h1><p>UX/UI Design • Web Development • Role-Based Dashboards</p></div>
    <div class="screens"><div class="frame landing"><img src="${images.landing}"></div><div class="frame booking"><img src="${images.booking}"></div><div class="frame dispatch"><img src="${images.dispatch}"></div><div class="chip">REAL WORKING APPLICATION</div></div>
  </div></body></html>`;
}

async function composeThumbnail4x3(browser) {
  const images = {
    background: await imageDataUrl(BACKGROUND),
    landing: await imageDataUrl(join(SCREEN_DIR, "01-landing-page.png")),
    booking: await imageDataUrl(join(SCREEN_DIR, "02-live-booking-calculator.png")),
    dispatch: await imageDataUrl(join(SCREEN_DIR, "03-dispatcher-board.png")),
  };
  for (const [path, type] of [[THUMBNAIL_4K_4X3, "png"], [THUMBNAIL_4K_4X3_JPG, "jpeg"]]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 960 }, deviceScaleFactor: 3 });
    await page.setContent(thumbnail4x3Html(images), { waitUntil: "load" });
    await page.screenshot({ path, type, ...(type === "jpeg" ? { quality: 95 } : {}) });
    await page.close();
  }
}

async function composeThumbnail(browser) {
  const images = {
    background: await imageDataUrl(BACKGROUND),
    landing: await imageDataUrl(join(SCREEN_DIR, "01-landing-page.png")),
    booking: await imageDataUrl(join(SCREEN_DIR, "02-live-booking-calculator.png")),
    dispatch: await imageDataUrl(join(SCREEN_DIR, "03-dispatcher-board.png")),
  };
  async function render(path, deviceScaleFactor, type = "png") {
    const page = await browser.newPage({ viewport: { width: 1280, height: 769 }, deviceScaleFactor });
    await page.setContent(thumbnailHtml(images), { waitUntil: "load" });
    await page.screenshot({ path, type, ...(type === "jpeg" ? { quality: 95 } : {}) });
    await page.close();
  }

  await render(THUMBNAIL, 1);
  await render(THUMBNAIL_4K, 3);
  await render(THUMBNAIL_4K_JPG, 3, "jpeg");
}

async function installCursor(page) {
  await page.context().addInitScript(() => {
    const install = () => {
      if (document.getElementById("portfolio-cursor")) return;
      const cursor = document.createElement("div");
      cursor.id = "portfolio-cursor";
      cursor.style.cssText = "position:fixed;left:50%;top:50%;width:22px;height:22px;z-index:2147483647;border:3px solid white;border-radius:50%;background:#9a35ed;box-shadow:0 3px 16px rgba(50,10,75,.6);pointer-events:none;transform:translate(-50%,-50%);transition:width .12s,height .12s,background .12s";
      document.documentElement.appendChild(cursor);
      window.addEventListener("mousemove", (event) => {
        cursor.style.left = `${event.clientX}px`;
        cursor.style.top = `${event.clientY}px`;
      }, true);
      window.addEventListener("mousedown", () => {
        cursor.style.width = "38px";
        cursor.style.height = "38px";
        cursor.style.background = "#ff746b";
      }, true);
      window.addEventListener("mouseup", () => {
        cursor.style.width = "22px";
        cursor.style.height = "22px";
        cursor.style.background = "#9a35ed";
      }, true);
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
    else install();
  });
}

function srtTime(seconds) {
  const milliseconds = Math.round(seconds * 1000);
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const secs = Math.floor((milliseconds % 60_000) / 1000);
  const millis = milliseconds % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
}

async function createVideo(browser, demo, verifiedState) {
  const videoDir = join(WORK_DIR, "recording");
  await mkdir(videoDir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: chromeUserAgent,
    storageState: verifiedState,
    recordVideo: { dir: videoDir, size: { width: 1920, height: 1080 } },
    colorScheme: "light",
    locale: "en-CA",
    timezoneId: "America/Toronto",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  await installCursor(page);
  const cues = [];
  const startedAt = Date.now();
  let activeCue = null;

  const elapsed = () => (Date.now() - startedAt) / 1000;
  async function subtitle(text, label) {
    if (activeCue) activeCue.end = elapsed();
    activeCue = { start: elapsed(), end: null, text };
    cues.push(activeCue);
    await page.evaluate(({ nextText, nextLabel }) => {
      document.getElementById("portfolio-subtitle")?.remove();
      const overlay = document.createElement("div");
      overlay.id = "portfolio-subtitle";
      overlay.innerHTML = `<span>${nextLabel}</span><strong>${nextText}</strong>`;
      overlay.style.cssText = "position:fixed;left:50%;bottom:34px;z-index:2147483646;width:min(1160px,calc(100vw - 100px));padding:16px 24px;transform:translateX(-50%);border:1px solid rgba(255,255,255,.22);border-radius:16px;background:rgba(39,13,52,.91);box-shadow:0 16px 45px rgba(18,4,26,.38);backdrop-filter:blur(12px);color:white;font-family:Inter,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;text-align:center;pointer-events:none";
      overlay.querySelector("span").style.cssText = "display:block;margin-bottom:4px;color:#f3b8ff;font-size:12px;font-weight:850;letter-spacing:.16em;text-transform:uppercase";
      overlay.querySelector("strong").style.cssText = "font-size:22px;line-height:1.35;font-weight:680";
      document.documentElement.appendChild(overlay);
    }, { nextText: text, nextLabel: label });
  }

  async function transitionTo(path, heading) {
    await page.evaluate(() => {
      const fade = document.createElement("div");
      fade.id = "portfolio-fade";
      fade.style.cssText = "position:fixed;inset:0;z-index:2147483645;background:#4b1764;opacity:0;transition:opacity .38s ease;pointer-events:none";
      document.documentElement.appendChild(fade);
      requestAnimationFrame(() => { fade.style.opacity = "1"; });
    }).catch(() => {});
    await wait(430);
    await goto(page, path, heading);
    await page.evaluate(() => {
      const fade = document.createElement("div");
      fade.style.cssText = "position:fixed;inset:0;z-index:2147483645;background:#4b1764;opacity:1;transition:opacity .42s ease;pointer-events:none";
      document.documentElement.appendChild(fade);
      requestAnimationFrame(() => { fade.style.opacity = "0"; });
      setTimeout(() => fade.remove(), 500);
    });
    await wait(520);
  }

  const background = await imageDataUrl(BACKGROUND);
  const landing = await imageDataUrl(join(SCREEN_DIR, "01-landing-page.png"));
  const booking = await imageDataUrl(join(SCREEN_DIR, "02-live-booking-calculator.png"));
  const mobile = await imageDataUrl(join(SCREEN_DIR, "05-responsive-mobile.png"));

  await page.setContent(`<!doctype html><html><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:white}body{display:grid;grid-template-columns:.92fr 1.08fr;align-items:center;padding:90px 110px;background:#34123f url('${background}') center/cover}.copy{position:relative;z-index:2}.badge{display:inline-block;padding:10px 15px;border:1px solid rgba(255,255,255,.32);border-radius:999px;background:rgba(255,255,255,.12);font-size:14px;font-weight:850;letter-spacing:.14em}.copy h1{margin:24px 0 12px;font-family:Georgia,serif;font-size:92px;line-height:.92;font-weight:500}.copy p{max-width:650px;color:#efdff5;font-size:26px;line-height:1.45}.visual{position:relative;height:720px}.shot{position:absolute;overflow:hidden;border:1px solid rgba(255,255,255,.45);border-radius:20px;background:#fff;box-shadow:0 35px 90px rgba(15,3,24,.5)}.shot img{width:100%;height:100%;object-fit:contain}.one{right:0;top:60px;width:820px;height:461px;transform:rotate(2deg)}.two{left:15px;bottom:45px;width:640px;height:360px;transform:rotate(-3deg)}</style><body><div class="copy"><div class="badge">LIVE SaaS CASE STUDY</div><h1>Gray Jay<br>Care</h1><p>NEMT booking, dispatch, driver operations and reporting—connected in one working platform.</p></div><div class="visual"><div class="shot one"><img src="${landing}"></div><div class="shot two"><img src="${booking}"></div></div></body></html>`, { waitUntil: "load" });
  await wait(4_000);

  await transitionTo("/", /Safe Journeys/);
  await subtitle("A calm, accessible landing experience designed for patients, families and care providers.", "Public experience");
  await wait(2_200);
  await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 1.35, behavior: "smooth" }));
  await wait(3_500);

  await transitionTo("/book", /Book a safe, caring ride/);
  await subtitle("One contact-first form captures the route, schedule, facility details and patient care needs.", "Smart booking flow");
  await page.getByLabel("Pickup address").fill("339 Windermere Road, London, ON");
  await wait(400);
  await page.getByLabel("Drop-off address").fill("800 Commissioners Road East, London, ON");
  await wait(400);
  await fillLongDate(page, "Pickup date and time", futureDateParts());
  await page.locator('input[name="mobilityType"][value="WHEELCHAIR"]').check({ force: true });
  await page.getByText("Oxygen required", { exact: false }).first().click();
  try {
    await page.locator('[class*="estimatedTotal"]').waitFor({ state: "visible", timeout: 20_000 });
  } catch {
    const manualDistance = page.getByLabel("Estimated trip distance (km)");
    if (!(await manualDistance.count())) throw new Error("The live fare estimate did not appear.");
    await manualDistance.fill("8.5");
    await page.locator('[class*="estimatedTotal"]').waitFor({ state: "visible", timeout: 20_000 });
  }
  await page.locator("form").evaluate((form) => form.scrollIntoView({ block: "start" }));
  await page.evaluate(() => window.scrollBy({ top: 190, behavior: "smooth" }));
  await subtitle("Google-assisted distance and the active 2026 rate sheet produce a transparent live fare breakdown.", "Live pricing");
  await wait(4_500);

  await login(page, accounts.dispatcher, "\\/dispatch");
  await subtitle("Website, phone and hospital requests arrive in one shared, time-ordered dispatch queue.", "Dispatcher board");
  const tripLink = page.getByRole("link", { name: demo.referenceCode, exact: true });
  await tripLink.waitFor({ state: "visible" });
  const card = tripLink.locator("xpath=ancestor::div[.//select][1]");
  const driverSelect = card.getByLabel(`Driver for ${demo.referenceCode}`);
  const vehicleSelect = card.getByLabel(`Vehicle for ${demo.referenceCode}`);
  const driverOptions = await driverSelect.locator("option").evaluateAll((nodes) => nodes.map((node) => ({ value: node.value, text: node.textContent || "" })));
  const driver = driverOptions.find((option) => option.value && /Dave Driver/i.test(option.text)) || driverOptions.find((option) => option.value);
  const vehicleOptions = await vehicleSelect.locator("option").evaluateAll((nodes) => nodes.map((node) => ({ value: node.value, text: node.textContent || "" })));
  const vehicle = vehicleOptions.find((option) => option.value && /GJC-001/i.test(option.text)) || vehicleOptions.find((option) => option.value);
  if (!driver || !vehicle) throw new Error("No eligible driver or compatible vehicle was available for the portfolio trip.");
  await driverSelect.selectOption(driver.value);
  await wait(700);
  await vehicleSelect.selectOption(vehicle.value);
  await wait(700);
  await card.getByRole("button", { name: "Assign trip" }).click();
  await card.getByText("ASSIGNED", { exact: true }).waitFor({ state: "visible" });
  await subtitle("Approved drivers and compatible active vehicles are assigned together in one safe action.", "Atomic assignment");
  await wait(3_200);

  await login(page, accounts.driver, "\\/driver");
  await subtitle("The driver receives only assigned work, with route, contact and care instructions in one place.", "Driver operations");
  await page.getByText(demo.referenceCode, { exact: true }).waitFor({ state: "visible" });
  await wait(2_000);
  const startButton = page.getByRole("button", { name: "Start trip (en route)", exact: true });
  if (await startButton.count()) {
    await startButton.click();
    await page.getByRole("button", { name: "Arrived at pickup", exact: true }).waitFor({ state: "visible" });
  }
  await subtitle("An enforced status timeline keeps dispatch and every authorized portal synchronized.", "Real-time trip lifecycle");
  await wait(3_300);

  await login(page, accounts.admin, "\\/admin");
  await subtitle("Administration connects staff roles, driver verification, fleet, pricing and audited activity.", "Operations control");
  await wait(2_300);
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight * 0.55, behavior: "smooth" }));
  await wait(2_700);

  await login(page, accounts.hospital, "\\/hospital");
  await subtitle("Hospital partners use the same complete booking and live-pricing workflow with scoped trip access.", "Partner portal");
  await page.getByRole("link", { name: "Book a trip for a patient" }).click();
  await page.getByText("Hospital portal booking", { exact: true }).waitFor({ state: "visible" });
  await wait(3_700);

  if (activeCue) activeCue.end = elapsed();
  await page.setContent(`<!doctype html><html><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:white}body{display:flex;align-items:center;padding:80px 105px;background:#34123f url('${background}') center/cover}.copy{width:38%}.copy span{color:#ffc1e8;font-weight:850;letter-spacing:.16em}.copy h1{margin:15px 0;font-family:Georgia,serif;font-size:72px;line-height:1}.copy p{color:#f0e0f5;font-size:24px;line-height:1.5}.devices{position:relative;width:62%;height:820px}.desktop,.phone{position:absolute;overflow:hidden;background:white;box-shadow:0 35px 90px rgba(15,3,24,.55)}.desktop{right:0;top:80px;width:840px;height:473px;border:10px solid #efe7f3;border-radius:23px}.phone{left:20px;bottom:20px;width:284px;height:594px;border:10px solid #24112c;border-radius:38px}.desktop img,.phone img{width:100%;height:100%;object-fit:contain;background:white}</style><body><div class="copy"><span>RESPONSIVE BY DESIGN</span><h1>One platform.<br>Every screen.</h1><p>A complete working case study—from booking and dispatch to driver operations, hospitals and reporting.</p></div><div class="devices"><div class="desktop"><img src="${landing}"></div><div class="phone"><img src="${mobile}"></div></div></body></html>`, { waitUntil: "load" });
  await subtitle("Responsive, secure and deployment-ready—Gray Jay Care is one connected operational platform.", "Full-stack case study");
  await wait(4_800);
  if (activeCue) activeCue.end = elapsed();

  const video = page.video();
  await page.close();
  await context.close();
  const recordedPath = await video.path();
  await rename(recordedPath, RAW_VIDEO);

  const rawDuration = duration(RAW_VIDEO);
  const finalDuration = rawDuration > 59 ? 58.8 : Math.max(45, rawDuration);
  const timingScale = Math.min(1, finalDuration / rawDuration);
  const padding = Math.max(0, finalDuration - rawDuration);
  const srt = cues.map((cue, index) => {
    const start = cue.start * timingScale;
    const end = Math.min((cue.end || cue.start + 2) * timingScale, finalDuration - 0.15);
    return `${index + 1}\n${srtTime(start)} --> ${srtTime(end)}\n${cue.text}\n`;
  }).join("\n");
  await writeFile(SUBTITLES, srt);

  const videoFilter = [
    ...(timingScale < 1 ? [`setpts=${timingScale.toFixed(8)}*PTS`] : []),
    "scale=1920:1080:force_original_aspect_ratio=decrease",
    "pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=#2f103a",
    ...(padding > 0 ? [`tpad=stop_mode=clone:stop_duration=${padding.toFixed(3)}`] : []),
    // Keep the branded cover fully visible from frame zero. Portfolio sites
    // commonly use the first decoded frame as the video thumbnail, so fading
    // in from black produces an empty-looking preview.
    `fade=t=out:st=${Math.max(0, finalDuration - 0.8).toFixed(3)}:d=0.8`,
  ].join(",");
  const musicFilter = `volume=0.10,afade=t=in:st=0:d=1.8,afade=t=out:st=${Math.max(0, finalDuration - 2).toFixed(3)}:d=2,atrim=duration=${finalDuration.toFixed(3)}`;
  run("ffmpeg", [
    "-y", "-loglevel", "error",
    "-i", RAW_VIDEO,
    "-stream_loop", "-1", "-i", MUSIC,
    "-filter_complex", `[0:v]${videoFilter}[v];[1:a]${musicFilter}[a]`,
    "-map", "[v]", "-map", "[a]",
    "-t", finalDuration.toFixed(3),
    "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "128k", "-ar", "48000",
    "-movflags", "+faststart", FINAL_VIDEO,
  ]);
}

async function cleanupDemo(demo) {
  const sshPassword = process.env.PORTFOLIO_SSH_PASSWORD;
  if (sshPassword) {
    const sshHost = process.env.PORTFOLIO_SSH_HOST;
    const sshPort = process.env.PORTFOLIO_SSH_PORT || "65002";
    const sshUser = process.env.PORTFOLIO_SSH_USER;
    if (!sshHost || !sshUser) throw new Error("PORTFOLIO_SSH_HOST and PORTFOLIO_SSH_USER are required for remote cleanup.");
    const remoteScript = String.raw`set -eu
DEMO_EMAIL="$1"
NODE=/opt/alt/alt-nodejs22/root/usr/bin/node
BUILD_ROOT="$HOME/domains/grayjaycare.com/hbuilds"
CLI=$(find "$BUILD_ROOT" -type f -path '*/source/node_modules/tsx/dist/cli.mjs' -print | head -n 1)
test -n "$CLI"
APP=$(dirname "$(dirname "$(dirname "$(dirname "$CLI")")")")
TMP=/home/u520060718/portfolio-cleanup-$$.json
trap 'rm -f "$TMP"' EXIT
"$NODE" -e 'require("fs").writeFileSync(process.argv[1], JSON.stringify({email:process.argv[2]}))' "$TMP" "$DEMO_EMAIL"
cd "$APP"
PATH=/opt/alt/alt-nodejs22/root/usr/bin:$PATH \
DOTENV_CONFIG_PATH="$BUILD_ROOT/config/.env" \
DEMO_RUN_MANIFEST="$TMP" \
"$NODE" node_modules/tsx/dist/cli.mjs scripts/cleanup-walkthrough-demo.ts
`;
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        execFileSync("sshpass", [
          "-e", "ssh",
          "-o", "ConnectTimeout=12",
          "-o", "PreferredAuthentications=password",
          "-o", "PubkeyAuthentication=no",
          "-p", sshPort,
          `${sshUser}@${sshHost}`,
          "bash", "-s", "--", demo.email,
        ], {
          env: { ...process.env, SSHPASS: sshPassword },
          input: remoteScript,
          stdio: ["pipe", "inherit", "inherit"],
        });
        return;
      } catch (error) {
        lastError = error;
        if (attempt < 3) await wait(2_000);
      }
    }
    throw lastError;
  }

  run("npx", ["tsx", "scripts/cleanup-walkthrough-demo.ts"], {
    env: { ...process.env, DEMO_RUN_MANIFEST: MANIFEST },
  });
}

async function main() {
  await Promise.all([SCREEN_DIR, CLIP_DIR, WORK_DIR].map((path) => mkdir(path, { recursive: true })));
  if (THUMBNAIL_4X3_ONLY) {
    const browser = await chromium.launch({ headless: true, ...(existsSync(chromePath) ? { executablePath: chromePath } : {}) });
    try {
      await composeThumbnail4x3(browser);
    } finally {
      await browser.close().catch(() => {});
    }
    console.log(JSON.stringify({ thumbnail4x3: THUMBNAIL_4K_4X3, thumbnail4x3Jpg: THUMBNAIL_4K_4X3_JPG }, null, 2));
    return;
  }
  if (THUMBNAIL_ONLY) {
    const browser = await chromium.launch({ headless: true, ...(existsSync(chromePath) ? { executablePath: chromePath } : {}) });
    try {
      await capturePublicScreensHiDpi(browser);
      await composeThumbnail(browser);
    } finally {
      await browser.close().catch(() => {});
    }
    console.log(JSON.stringify({ thumbnail: THUMBNAIL, thumbnail4k: THUMBNAIL_4K, thumbnail4kJpg: THUMBNAIL_4K_JPG }, null, 2));
    return;
  }

  const demo = { email: `walkthrough.portfolio.${Date.now()}@example.test`, tripId: "", referenceCode: "" };
  const browser = await chromium.launch({ headless: true, ...(existsSync(chromePath) ? { executablePath: chromePath } : {}) });
  let demoCreated = false;
  let workError = null;
  try {
    await writeFile(MANIFEST, JSON.stringify(demo, null, 2));
    demoCreated = true;
    const setup = await browser.newContext({ viewport: { width: 1600, height: 900 }, userAgent: chromeUserAgent, locale: "en-CA", timezoneId: "America/Toronto" });
    const setupPage = await setup.newPage();
    await createDemoTrip(setupPage, demo);
    await setup.close();

    const verifiedState = await captureScreens(browser, demo);
    await composeThumbnail(browser);
    await createVideo(browser, demo, verifiedState);
  } catch (error) {
    workError = error;
    throw error;
  } finally {
    await browser.close().catch(() => {});
    if (demoCreated) {
      try {
        await cleanupDemo(demo);
      } catch (cleanupError) {
        if (!workError) throw cleanupError;
        console.error("Portfolio demo cleanup also failed:", cleanupError);
      }
    }
  }

  await writeFile(MUSIC_CREDIT, [
    "Music: Arabic Islamic Muslim Background Music",
    "Creator: ikoliks_aj",
    "Source: https://pixabay.com/music/world-arabic-islamic-muslim-background-music-318228/",
    "License: Pixabay Content License (verify the current license terms when publishing)",
    "Used at low volume in Gray Jay Care Portfolio Walkthrough.",
    "",
  ].join("\n"));

  console.log(JSON.stringify({
    thumbnail: THUMBNAIL,
    thumbnail4k: THUMBNAIL_4K,
    thumbnail4kJpg: THUMBNAIL_4K_JPG,
    video: FINAL_VIDEO,
    subtitles: SUBTITLES,
    duration: duration(FINAL_VIDEO),
  }, null, 2));
}

await main();
