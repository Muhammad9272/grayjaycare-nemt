import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const BASE_URL = (process.env.DEMO_BASE_URL || "https://grayjaycare.org").replace(/\/$/, "");
const PASSWORD = process.env.DEMO_PASSWORD;
const VOICE = process.env.DEMO_VOICE || "Samantha";
const SPEECH_RATE = process.env.DEMO_SPEECH_RATE || "155";
const FAST_REHEARSAL = process.env.DEMO_FAST === "1";
const DEBUG = process.env.DEMO_DEBUG === "1";
const OUTPUT_DIR = resolve(process.env.DEMO_OUTPUT_DIR || "artifacts/client-demo");
const FINAL_VIDEO = join(OUTPUT_DIR, "Gray-Jay-Care-Full-Platform-Walkthrough.mp4");
const TRANSCRIPT = join(OUTPUT_DIR, "Gray-Jay-Care-Full-Platform-Walkthrough-Transcript.txt");
const CHAPTERS = join(OUTPUT_DIR, "Gray-Jay-Care-Full-Platform-Walkthrough-Chapters.txt");
const RUN_MANIFEST = join(OUTPUT_DIR, "walkthrough-demo-run.json");

if (!PASSWORD) {
  throw new Error("DEMO_PASSWORD is required. Pass the private seeded-account password through the environment.");
}

const accounts = {
  admin: process.env.DEMO_ADMIN_EMAIL || "admin@grayjaycare.org",
  dispatcher: process.env.DEMO_DISPATCHER_EMAIL || "dispatcher@grayjaycare.ca",
  driver: process.env.DEMO_DRIVER_EMAIL || "driver@grayjaycare.ca",
  accountant: process.env.DEMO_ACCOUNTANT_EMAIL || "accountant@grayjaycare.ca",
  hospital: process.env.DEMO_HOSPITAL_EMAIL || "hospital@grayjaycare.ca",
};

const runId = Date.now();
const demoEmail = `walkthrough.${runId}@example.test`;
const demo = {
  email: demoEmail,
  contactName: "Morgan Training Coordinator",
  patientName: "Taylor Demo Patient",
  phone: "5195550199",
  extension: "214",
  medicalRecordNumber: `DEMO-${String(runId).slice(-6)}`,
  tripId: "",
  referenceCode: "",
};

const scenes = [
  {
    id: "welcome",
    number: "01",
    title: "Welcome to Gray Jay Care",
    subtitle: "A complete journey through the public website and every operational portal",
    narration: `Welcome to the Gray Jay Care platform walkthrough. In this demonstration, we will follow one fictional non-emergency medical transportation request through the complete system. We will begin as a member of the public, create a booking, and see the automatic customer portal. Then we will sign in as an administrator, dispatcher, driver, accountant, and hospital partner. Most importantly, we will watch the same booking move through assignment, pickup, transport, completion, reporting, and the customer's final status timeline. All names and contact details used here are training data. Gray Jay Care supports non-emergency transportation; if someone is experiencing a medical emergency, they should call nine one one.`,
  },
  {
    id: "public-site",
    number: "02",
    title: "Public website",
    subtitle: "Simple information, services, trust signals, FAQs, reviews, and contact options",
    narration: `The landing page is designed for patients, families, discharge teams, and care providers who may be making arrangements under pressure. The main message, phone number, and Book Now action are visible immediately. The page explains the company's Canadian service history, partner relationships, and the promise of safe and compassionate transport. Further down, visitors can understand ambulatory, wheelchair, and stretcher services without technical language. The frequently asked questions explain what non-emergency medical transportation is, how to book, what vehicles are used, driver training, and cancellation or rescheduling. Reviews provide social proof, and the final contact section gives direct ways to call or email. A visitor can get general information without creating an account or entering personal data.`,
  },
  {
    id: "accounts",
    number: "03",
    title: "Accounts and secure access",
    subtitle: "Optional customer registration, driver application, and one shared role-aware login",
    narration: `Customers who expect to book regularly can create a portal account with their name, email, phone number, and a strong password. Registration is optional, because the booking flow can create an account automatically for a first-time customer. Drivers have a separate application that also collects a licence number and a clearly written expiry date. A new driver remains pending until administration verifies the licence, so an applicant cannot access operational trips prematurely. Every approved user signs in from the same professional login page. The platform checks the role and redirects the person to the correct dashboard. A forgotten password does not reveal whether an email is registered, and reset links are time limited. For this demonstration we will show the forms, but we will not create unnecessary sample accounts.`,
  },
  {
    id: "booking-contact",
    number: "04",
    title: "Booking — contact information",
    subtitle: "The fastest route starts with the person dispatch should contact",
    narration: `Now we will make a real training request on the live booking page. Contact information is deliberately the first section. The person arranging transport may be the patient, a family member, a hospital unit, or another caregiver, so dispatch needs a reliable contact before anything else. We enter the contact person's full name, a phone number, an optional extension for a hospital or facility, and an email address. The email will receive the booking reference and secure portal instructions. Notice the reassurance at the top: no account is required, the fare estimate updates live, and a dispatcher will still confirm availability and final details. The page also keeps the twenty-four-hour phone number visible for a visitor who needs human assistance instead of the form.`,
  },
  {
    id: "booking-trip",
    number: "05",
    title: "Booking — route and schedule",
    subtitle: "Google-assisted addresses, readable dates, service type, and return-trip options",
    narration: `For the trip, we begin typing each location and choose a suggestion powered by Google. This reduces spelling errors, standardizes the address, and provides the coordinates used for route distance. Facility department and room fields are available for both pickup and destination, which is especially important for hospital transfers. The date control shows a day, the month name in words, the year, and a separate time, making the schedule easier to read than a numeric date. The timing can be a specific appointment, first available or A S A P, or any time that day. We then choose whether the ride stays within London, and select ambulatory, wheelchair, or stretcher service. One-way, scheduled return, wait-and-return, and call-when-ready scenarios are all supported. For this example, we will use a one-way wheelchair transfer.`,
  },
  {
    id: "booking-care",
    number: "06",
    title: "Booking — patient needs and fare",
    subtitle: "Operational care details feed the same live 2026 pricing service",
    narration: `The patient section gives dispatch and the driver the information required to prepare safely. We add a fictional patient name and medical record number, then select an escort, oxygen, isolation, D N R paperwork, waiting time, weight, payment preference, and any extra attendant needs. Medical documents are not uploaded into an ordinary email workflow; the form records that documents exist so dispatch can arrange secure collection. Notes can include an entrance, appointment, transfer assistance, or other instructions. As the route, date, service, and add-ons change, the fare card recalculates from the active twenty twenty-six rate sheet. It separates the base fare, distance, waiting, oxygen, attendant, special-time charges, discounts, and total. This is an estimate, and dispatch provides the final confirmation. We will submit this request only once.`,
  },
  {
    id: "customer-first-look",
    number: "07",
    title: "Automatic customer portal",
    subtitle: "Immediate status access with a secure password-setup path",
    narration: `The request has been accepted and the first-time customer is signed directly into My Care Journeys. There was no registration obstacle and no temporary password to copy. Behind the scenes, the email address was used to provision a customer account, and the system sends a secure one-hour password-setup link. Passwords themselves are never sent by email. The new card has a unique reference, a Request Submitted status, route, readable appointment time, and cancellation control. Opening the reference shows the full booking details, care requirements, contact information, estimated fare, and a time-stamped status timeline. Driver and vehicle are not yet assigned, which is accurate at this stage. Account and Security lets the customer request another setup or reset link later. We will save this authenticated customer session and return after operations completes the trip.`,
  },
  {
    id: "admin-overview",
    number: "08",
    title: "Administration and access control",
    subtitle: "Oversight, verification, staff roles, recent bookings, and audit activity",
    narration: `We now sign in as the super administrator. The overview combines the information needed for operational oversight: total users, approved drivers, vehicles, pending bookings, driver verification, recent bookings, and recent audited actions. A pending driver can be reviewed here and approved or rejected after licence checks. We will leave the training record unchanged during this demonstration. The Staff page provides search, role filtering, account activation controls, and staff invitation. Administrators can create dispatch, driver, accounting, hospital, or other authorized users without sharing a single generic login. Each role receives only its own navigation and permissions. Important events, including booking creation, assignment, status changes, and administrative updates, are written to the audit history so the organization has a traceable record of who did what.`,
  },
  {
    id: "admin-operations",
    number: "09",
    title: "Fleet, pricing, and all trips",
    subtitle: "Central control of vehicles, the rate sheet, and searchable booking history",
    narration: `The Fleet area lists each vehicle's plate, year, make, model, service type, capacity, odometer, and current operational status. Opening a vehicle brings together assigned drivers, inspections, mileage, fuel, and maintenance history. Safety guards prevent a vehicle on an active trip from being moved into maintenance by mistake. The Pricing area is the source of truth for public, phone, and hospital estimates. It includes wheelchair and stretcher base fares, London and out-of-city distance bands, bariatric support, waiting, oxygen, extra attendants, return discounts, cancellation rules, tax, and night hours. Changes apply to future estimates, so we explain the controls without saving anything. Finally, All Trips allows staff to search by reference, patient, contact, phone, medical record number, or address, and filter by every operational status.`,
  },
  {
    id: "dispatch",
    number: "10",
    title: "Dispatcher workflow",
    subtitle: "Review the request, assign compatible resources, and handle phone bookings",
    narration: `The dispatcher board shows all active work in scheduled order. Our same training request includes the patient, booking contact, phone extension, medical record number, route, time, estimated fare, and prominent care flags. The dispatcher selects an approved driver and an active vehicle compatible with the mobility request. A stretcher booking, for example, cannot be assigned to an unsuitable vehicle. When both selections are saved, the booking becomes Assigned, the driver's trip list updates, and the customer's portal timeline updates from the same database record. Dispatch can cancel with an audit note when required. The New Phone Booking control handles callers who cannot or do not want to use the website. It uses the same Google address assistance, readable schedule, service choices, pricing logic, and downstream workflow while recording Phone as the source.`,
  },
  {
    id: "driver-trip",
    number: "11",
    title: "Driver journey lifecycle",
    subtitle: "Assigned → en route → arrived → in progress → completed",
    narration: `Next we sign in as the approved driver. My Trips contains only work assigned to this driver. The card shows the booking reference, patient, phone number, pickup and destination units, scheduled time, mobility type, care flags, and operational notes. The driver can also mark availability as on duty or off duty. Trip progress is intentionally ordered. First the driver starts the trip and becomes En Route. At the pickup location, the driver selects Arrived. After the passenger is safely received, the status becomes In Progress. At the destination, Complete Trip closes the active journey. Unauthorized changes and impossible jumps directly from Assigned to Completed are rejected by the backend. Each accepted action creates a time-stamped status event. Completion moves the booking into Trip History and automatically creates a draft invoice using the final fare.`,
  },
  {
    id: "driver-fleet",
    number: "12",
    title: "Driver vehicle and logs",
    subtitle: "Inspection, mileage, fuel, assigned vehicle, and trip history",
    narration: `The completed ride is now visible in the driver's Trip History rather than the active queue. Vehicle and Logs shows the driver's assigned vehicle, capacity, odometer, and operational status. From this page the driver can record a pre-trip or post-trip inspection, including pass or fail, odometer, and notes. Mileage captures start and end readings and can be associated with a trip. Fuel records litres, cost, and the current odometer. The recent entries remain visible for verification and later reporting. These controls connect driver activity to the fleet rather than keeping isolated paper notes. In a client demonstration, it is safest to open the forms and explain them without saving fictional vehicle readings, which is what we do here.`,
  },
  {
    id: "accounting",
    number: "13",
    title: "Accounting and reporting",
    subtitle: "Completed work becomes revenue, utilization, invoice, and export data",
    narration: `The accounting role receives a focused reporting dashboard without staff or dispatch controls. The date range uses the same readable day, month name, and year format. For that period, the page summarizes revenue, completed trips, cancellations, no-shows, and average fare. It also groups completed work by driver and by vehicle so management can understand utilization. Our training booking now appears in the completed-trip list with its reference, completion date, patient, route, fare, and draft invoice status. Opening the reference provides the same authoritative trip details and event history. The Export C S V action produces a bookkeeping-friendly file for external accounting or analysis. Because reporting is based on completed database records, dispatch, driver history, the invoice, and financial totals stay connected instead of requiring duplicate entry.`,
  },
  {
    id: "hospital",
    number: "14",
    title: "Hospital partner portal",
    subtitle: "A shorter repeat-booking experience with organization-scoped patient trips",
    narration: `Hospital partners have a dedicated organization portal. This account sees the facility name, upcoming and historical patient trips, and a shorter repeat-booking form. Staff can enter Google-assisted pickup and destination addresses, a readable date and time, service type, patient name and phone, trip area, bariatric support, oxygen, extra attendant needs, and notes. The same pricing service produces the estimate. Once submitted, the source is recorded as Hospital Portal and the request enters the normal dispatcher workflow. Hospital users see only trips belonging to their organization, while authorized Gray Jay Care staff can coordinate them. In this walkthrough we open and partially demonstrate the form, but do not submit a second fictional trip. That keeps the operational board clean while still showing the alternative institutional scenario.`,
  },
  {
    id: "customer-complete",
    number: "15",
    title: "Customer sees the completed journey",
    subtitle: "One reference connects every status, assigned resource, and final fare",
    narration: `We now restore the original customer's secure session. The same booking that began as Request Submitted is marked Completed. Opening the reference closes the loop: the customer can see the route, appointment information, service and care details, assigned driver and vehicle, estimated and final fare, and the complete sequence of submitted, assigned, en route, arrived, in progress, and completed events. Status refresh occurs automatically while a trip is active. Early-stage bookings can be cancelled from the portal; the configured notice window determines whether a late-cancellation fee applies. Account and Security shows the customer's email and phone and can send another one-hour password link. This low-friction design gives immediate access during booking while preserving a secure way to return later. Other customers, unrelated hospitals, and unrelated drivers cannot open this booking.`,
  },
  {
    id: "mobile-close",
    number: "16",
    title: "Responsive access and final recap",
    subtitle: "The same connected workflow on desktop and mobile",
    narration: `Finally, the customer portal and public website adapt to a phone-sized screen with a compact navigation menu and touch-friendly controls. This matters because patients, family members, and drivers will often use the system away from a desk. To recap, the public website explains the service clearly; Google-assisted addresses and readable dates reduce booking errors; a first-time booking creates immediate portal access without emailing a password; dispatch assigns suitable resources; drivers follow an enforced status sequence; completion creates connected history and accounting data; hospitals receive a scoped repeat-booking portal; and administrators manage people, fleet, pricing, and audit activity. The result is one end-to-end Gray Jay Care workflow rather than disconnected pages. This video and the accompanying presenter guide can be reused for client onboarding, staff training, and future demonstrations.`,
  },
];

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const pause = (milliseconds) => new Promise((resolvePromise) =>
  setTimeout(resolvePromise, FAST_REHEARSAL ? Math.max(20, milliseconds * 0.1) : milliseconds),
);

function runBinary(command, args, options = {}) {
  execFileSync(command, args, { stdio: options.quiet ? "ignore" : "inherit", ...options });
}

function mediaDuration(path) {
  return Number(
    execFileSync("ffprobe", [
      "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path,
    ], { encoding: "utf8" }).trim(),
  );
}

function formatTimestamp(seconds) {
  const rounded = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

async function installCursor(page) {
  await page.context().addInitScript(() => {
    const install = () => {
      if (document.getElementById("gjc-demo-cursor")) return;
      const cursor = document.createElement("div");
      cursor.id = "gjc-demo-cursor";
      cursor.setAttribute("aria-hidden", "true");
      cursor.style.cssText = "position:fixed;left:0;top:0;width:18px;height:18px;border:3px solid white;border-radius:50%;background:#9a35ed;box-shadow:0 2px 12px rgba(52,16,83,.55);z-index:2147483647;pointer-events:none;transform:translate(-50%,-50%);transition:width .12s,height .12s,background .12s;";
      document.documentElement.appendChild(cursor);
      window.addEventListener("mousemove", (event) => {
        cursor.style.left = `${event.clientX}px`;
        cursor.style.top = `${event.clientY}px`;
      }, true);
      window.addEventListener("mousedown", () => {
        cursor.style.width = "34px";
        cursor.style.height = "34px";
        cursor.style.background = "#ff746c";
      }, true);
      window.addEventListener("mouseup", () => {
        cursor.style.width = "18px";
        cursor.style.height = "18px";
        cursor.style.background = "#9a35ed";
      }, true);
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
    else install();
  });
}

async function showChapter(page, scene) {
  await page.evaluate(({ number, title, subtitle }) => {
    document.getElementById("gjc-demo-chapter")?.remove();
    const card = document.createElement("div");
    card.id = "gjc-demo-chapter";
    card.setAttribute("aria-hidden", "true");
    card.innerHTML = `<span>CHAPTER ${number}</span><strong>${title}</strong><small>${subtitle}</small>`;
    card.style.cssText = "position:fixed;top:28px;left:32px;width:min(620px,calc(100vw - 64px));padding:20px 24px;border-radius:18px;background:linear-gradient(135deg,rgba(73,28,105,.97),rgba(156,50,237,.96));color:white;box-shadow:0 20px 55px rgba(49,20,70,.35);z-index:2147483646;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;flex-direction:column;gap:5px;opacity:0;transform:translateY(-10px);transition:opacity .3s,transform .3s;pointer-events:none";
    const chapterLabel = card.querySelector("span");
    const heading = card.querySelector("strong");
    const description = card.querySelector("small");
    chapterLabel.style.cssText = "font-size:11px;font-weight:800;letter-spacing:.18em;color:#f4caff";
    heading.style.cssText = "font-size:25px;line-height:1.15;font-weight:760";
    description.style.cssText = "font-size:14px;line-height:1.45;color:#f5eafa";
    document.documentElement.appendChild(card);
    requestAnimationFrame(() => {
      card.style.opacity = "1";
      card.style.transform = "translateY(0)";
    });
    setTimeout(() => {
      card.style.opacity = "0";
      card.style.transform = "translateY(-10px)";
      setTimeout(() => card.remove(), 350);
    }, 4200);
  }, scene);
}

async function goto(page, path, expectedHeading) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  if (expectedHeading) {
    await page.getByRole("heading", { level: 1, name: expectedHeading }).waitFor({ state: "visible", timeout: 30_000 });
  }
}

async function typeSlow(locator, value) {
  await locator.scrollIntoViewIfNeeded();
  await locator.click();
  await locator.fill("");
  await locator.pressSequentially(value, { delay: 34 });
  await pause(450);
}

async function chooseGoogleAddress(page, label, query, fallback) {
  const input = page.getByLabel(label, { exact: true });
  await typeSlow(input, query);
  const firstOption = page.getByRole("option").first();
  try {
    await firstOption.waitFor({ state: "visible", timeout: 12_000 });
    await pause(1700);
    await firstOption.click();
    await pause(1400);
  } catch {
    await input.fill(fallback);
    await pause(800);
  }
}

function futureDateParts(daysAhead = 7) {
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
  await pause(350);
  await page.getByLabel(`${label}: month`).selectOption(parts.month);
  await pause(350);
  await page.getByLabel(`${label}: year`).selectOption(parts.year);
  await pause(350);
  if (parts.time) await page.getByLabel(`${label}: time`).fill(parts.time);
  await pause(700);
}

async function loginAs(context, page, email, expectedPath) {
  await context.clearCookies();
  await goto(page, "/login", /Sign in to your portal/);
  await typeSlow(page.getByLabel("Email address"), email);
  await typeSlow(page.locator('input[name="password"]'), PASSWORD);
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await page.waitForURL(new RegExp(expectedPath), { timeout: 40_000 });
  await page.locator("h1").first().waitFor({ state: "visible", timeout: 30_000 });
  await pause(1300);
}

async function scrollWindow(page, positions, delay = 2100) {
  for (const fraction of positions) {
    await page.evaluate((nextFraction) => {
      const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo({ top: maximum * nextFraction, behavior: "smooth" });
    }, fraction);
    await pause(delay);
  }
}

async function selectMatchingOption(select, pattern) {
  const options = await select.locator("option").evaluateAll((nodes) => nodes.map((node) => ({
    value: node.value,
    text: node.textContent || "",
  })));
  const match = options.find((option) => option.value && pattern.test(option.text));
  const fallback = options.find((option) => option.value);
  if (!match && !fallback) throw new Error("No selectable option was available.");
  const selectedValue = (match || fallback).value;
  await select.selectOption(selectedValue);
  return selectedValue;
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const workDir = await mkdtemp(join(tmpdir(), "grayjay-walkthrough-"));
  const videoDir = join(workDir, "browser-video");
  const audioDir = join(workDir, "audio");
  await mkdir(videoDir);
  await mkdir(audioDir);

  console.log(`Preparing ${scenes.length} narrated chapters with macOS voice ${VOICE}...`);
  for (const [index, scene] of scenes.entries()) {
    const audioPath = join(audioDir, `${String(index + 1).padStart(2, "0")}-${scene.id}.aiff`);
    runBinary("say", ["-v", VOICE, "-r", SPEECH_RATE, "-o", audioPath, scene.narration], { quiet: true });
    scene.audioPath = audioPath;
    scene.audioDuration = mediaDuration(audioPath);
    scene.targetDuration = FAST_REHEARSAL ? 0 : Math.ceil(scene.audioDuration + 2.2);
  }

  const browser = await chromium.launch({
    headless: true,
    ...(existsSync(chromePath) ? { executablePath: chromePath } : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: videoDir, size: { width: 1440, height: 900 } },
    colorScheme: "light",
    locale: "en-CA",
    timezoneId: "America/Toronto",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  page.setDefaultNavigationTimeout(90_000);
  await installCursor(page);

  let customerCookies = [];
  const actualDurations = [];
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("favicon")) browserErrors.push(message.text());
  });
  if (DEBUG) {
    page.on("response", async (response) => {
      if (response.url().includes("/api/pricing/quote")) {
        console.log(`Quote response ${response.status()}: ${await response.text().catch(() => "<unreadable>")}`);
      }
    });
    page.on("requestfailed", (request) => console.log(`Request failed: ${request.url()} — ${request.failure()?.errorText}`));
  }

  async function perform(scene) {
    switch (scene.id) {
      case "welcome": {
        await goto(page, "/", /Safe Journeys/);
        await showChapter(page, scene);
        await pause(5000);
        await scrollWindow(page, [0.08, 0.16], 2200);
        break;
      }
      case "public-site": {
        await goto(page, "/", /Safe Journeys/);
        await showChapter(page, scene);
        await scrollWindow(page, [0.2, 0.38, 0.58, 0.75, 0.92, 1], 2800);
        break;
      }
      case "accounts": {
        await goto(page, "/register", /Create your care portal/);
        await showChapter(page, scene);
        await typeSlow(page.getByLabel("First name"), "Jordan");
        await typeSlow(page.getByLabel("Last name"), "Example");
        await typeSlow(page.getByLabel("Email address"), `registration.preview.${runId}@example.test`);
        await typeSlow(page.getByLabel("Phone number"), "5195550123");
        await typeSlow(page.getByLabel("Password"), "PreviewOnly123!");
        await pause(1800);
        await goto(page, "/register/driver", /Apply to drive with us/);
        await scrollWindow(page, [0.45, 0.92], 2600);
        await goto(page, "/login", /Sign in to your portal/);
        await pause(2200);
        await page.getByRole("link", { name: "Forgot password?" }).hover();
        break;
      }
      case "booking-contact": {
        await goto(page, "/book", /Book a safe, caring ride/);
        await showChapter(page, scene);
        await typeSlow(page.getByLabel("Contact person's full name"), demo.contactName);
        await typeSlow(page.getByLabel("Phone number"), demo.phone);
        await typeSlow(page.getByLabel("Phone extension"), demo.extension);
        await typeSlow(page.getByLabel("Email address"), demo.email);
        await pause(1800);
        break;
      }
      case "booking-trip": {
        await showChapter(page, scene);
        await chooseGoogleAddress(page, "Pickup address", "University Hospital London Ontario", "339 Windermere Road, London, ON");
        await typeSlow(page.getByLabel("Pickup department"), "Main Lobby Discharge Desk");
        await typeSlow(page.getByLabel("Pickup room"), "Room 214");
        await chooseGoogleAddress(page, "Drop-off address", "Victoria Hospital London Ontario", "800 Commissioners Road East, London, ON");
        await typeSlow(page.getByLabel("Drop-off department"), "Medical Imaging");
        await typeSlow(page.getByLabel("Drop-off room"), "Room B1-120");
        await fillLongDate(page, "Pickup date and time", futureDateParts());
        await page.getByLabel("Preferred timing").selectOption("SPECIFIC");
        await page.locator('input[name="mobilityType"][value="WHEELCHAIR"]').check({ force: true });
        const tripType = page.getByLabel("One-way or return trip?");
        await tripType.selectOption("SCHEDULED_RETURN");
        await pause(1800);
        await tripType.selectOption("ONE_WAY");
        await pause(1800);
        break;
      }
      case "booking-care": {
        await showChapter(page, scene);
        await typeSlow(page.getByLabel("Patient's full name"), demo.patientName);
        await typeSlow(page.getByLabel("Medical record number"), demo.medicalRecordNumber);
        await page.getByText("Oxygen required", { exact: false }).first().click();
        await page.getByLabel("People escorting the patient").selectOption("1");
        await page.getByLabel("Isolation precautions?").selectOption("no");
        await page.getByLabel("DNR paperwork available?").selectOption("yes");
        await page.getByLabel("Payment preference").selectOption("CARD");
        await typeSlow(page.getByLabel("Expected waiting time"), "20");
        await typeSlow(page.getByLabel("Passenger weight"), "72");
        await page.getByText("Medical documents are available", { exact: false }).click();
        await typeSlow(page.getByLabel("Driver or dispatcher notes"), "Training scenario only. Please meet the patient at the main lobby discharge desk.");
        const manualDistance = page.getByLabel("Estimated trip distance (km)");
        try {
          await manualDistance.waitFor({ state: "attached", timeout: 6000 });
          await typeSlow(manualDistance, "8.5");
        } catch {
          // A Google route was resolved, so the manual fallback is not rendered.
        }
        if (DEBUG) {
          console.log("Booking state", await page.evaluate(() => ({
            pickup: document.querySelector('input[placeholder="123 Main St, London, ON"]')?.value,
            dropoff: document.querySelector('input[placeholder="Hospital, clinic or home address"]')?.value,
            day: document.querySelector('select[aria-label="Pickup date and time: day"]')?.value,
            month: document.querySelector('select[aria-label="Pickup date and time: month"]')?.value,
            year: document.querySelector('select[aria-label="Pickup date and time: year"]')?.value,
            time: document.querySelector('input[aria-label="Pickup date and time: time"]')?.value,
            bodyTextIncludesEstimate: document.body.innerText.includes("Estimated total"),
            bodyTextIncludesManual: document.body.innerText.includes("Estimated trip distance"),
          })));
        }
        await page.locator('[class*="summaryColumn"]').scrollIntoViewIfNeeded();
        await pause(1400);
        await page.locator('[class*="estimatedTotal"]').first().waitFor({ state: "visible", timeout: 30_000 });
        await pause(3500);
        await page.getByRole("button", { name: "Request this booking" }).click();
        await page.waitForURL(/\/portal\?booked=/, { timeout: 120_000 });
        demo.tripId = new URL(page.url()).searchParams.get("booked") || "";
        if (!demo.tripId) throw new Error("The submitted booking did not return a trip ID.");
        const referenceLink = page.locator(`a[href="/trips/${demo.tripId}"]`).first();
        await referenceLink.waitFor({ state: "visible", timeout: 30_000 });
        demo.referenceCode = (await referenceLink.innerText()).trim();
        customerCookies = await context.cookies();
        await writeFile(RUN_MANIFEST, `${JSON.stringify({ ...demo, createdAt: new Date().toISOString(), baseUrl: BASE_URL }, null, 2)}\n`, { mode: 0o600 });
        await pause(2500);
        break;
      }
      case "customer-first-look": {
        await showChapter(page, scene);
        await pause(2600);
        await page.locator(`a[href="/trips/${demo.tripId}"]`).first().click();
        await page.getByRole("heading", { level: 1 }).waitFor({ state: "visible" });
        await scrollWindow(page, [0.28, 0.62, 0.92], 2600);
        await goto(page, "/portal/settings", /Your portal account/);
        await pause(3500);
        await goto(page, "/portal", /My care journeys/);
        break;
      }
      case "admin-overview": {
        await loginAs(context, page, accounts.admin, "\\/admin");
        await showChapter(page, scene);
        await scrollWindow(page, [0.3, 0.68, 1], 2600);
        await goto(page, "/admin/staff", /Users/);
        await pause(2800);
        await page.locator('input[name="q"]').fill("dispatcher");
        await pause(1800);
        await page.locator('select[name="role"]').selectOption("DISPATCHER");
        await pause(1800);
        break;
      }
      case "admin-operations": {
        await goto(page, "/admin/vehicles", /Fleet/);
        await showChapter(page, scene);
        await pause(2600);
        const vehicleLink = page.getByRole("link", { name: /GJC-001/ }).first();
        if (await vehicleLink.count()) {
          await vehicleLink.click();
          await page.getByRole("heading", { level: 1, name: /GJC-001/ }).waitFor({ state: "visible" });
          await scrollWindow(page, [0.45, 0.9], 2200);
        }
        await goto(page, "/admin/pricing", /2026 pricing calculator/);
        await scrollWindow(page, [0.22, 0.5, 0.78], 2400);
        await goto(page, `/admin/trips?q=${encodeURIComponent(demo.referenceCode)}`, /All trips/);
        await pause(2800);
        break;
      }
      case "dispatch": {
        await loginAs(context, page, accounts.dispatcher, "\\/dispatch");
        await showChapter(page, scene);
        const tripLink = page.getByRole("link", { name: demo.referenceCode, exact: true });
        await tripLink.waitFor({ state: "visible", timeout: 30_000 });
        const card = tripLink.locator("xpath=ancestor::div[.//select][1]");
        const selects = card.locator("select");
        await selectMatchingOption(selects.nth(0), /Dave Driver/i);
        await pause(1800);
        await selectMatchingOption(selects.nth(1), /GJC-001/i);
        await pause(1800);
        await card.getByRole("button", { name: "Assign trip" }).click();
        const assignedCard = page.getByRole("link", { name: demo.referenceCode, exact: true }).locator("xpath=ancestor::div[.//select][1]");
        await assignedCard.getByText("ASSIGNED", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
        await pause(2200);
        await page.getByRole("link", { name: "+ New phone booking" }).click();
        await page.getByRole("heading", { level: 1, name: /Book a safe, caring ride/ }).waitFor({ state: "visible" });
        await pause(3000);
        await scrollWindow(page, [0.18, 0.38], 1800);
        await goto(page, `/trips/${demo.tripId}`, /University Hospital|339 Windermere/);
        await pause(2200);
        break;
      }
      case "driver-trip": {
        await loginAs(context, page, accounts.driver, "\\/driver");
        await showChapter(page, scene);
        await page.getByText(demo.referenceCode, { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
        const actions = [
          ["Start trip (en route)", "Arrived at pickup"],
          ["Arrived at pickup", "Passenger picked up"],
          ["Passenger picked up", "Complete trip"],
          ["Complete trip", null],
        ];
        for (const [buttonName, nextButton] of actions) {
          await pause(2600);
          await page.getByRole("button", { name: buttonName, exact: true }).click();
          if (nextButton) {
            await page.getByRole("button", { name: nextButton, exact: true }).waitFor({ state: "visible", timeout: 30_000 });
          } else {
            await page.getByText("No trips assigned right now.").waitFor({ state: "visible", timeout: 30_000 });
          }
        }
        await goto(page, "/driver/history", /Trip history/);
        await page.getByText(demo.referenceCode, { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
        await pause(2800);
        break;
      }
      case "driver-fleet": {
        await goto(page, "/driver/vehicle", /Vehicle & logs/);
        await showChapter(page, scene);
        await pause(2300);
        await page.waitForTimeout(1200);
        await page.getByRole("button", { name: "Log inspection" }).click();
        await page.getByRole("heading", { name: "Log inspection" }).waitFor({ state: "visible" });
        await pause(2600);
        await page.getByRole("button", { name: "Cancel" }).click();
        await page.getByRole("button", { name: "Log mileage" }).click();
        await page.getByRole("heading", { name: "Log mileage" }).waitFor({ state: "visible" });
        await pause(2600);
        await page.getByRole("button", { name: "Cancel" }).click();
        await page.getByRole("button", { name: "Log fuel" }).click();
        await page.getByRole("heading", { name: "Log fuel" }).waitFor({ state: "visible" });
        await pause(2600);
        await page.getByRole("button", { name: "Cancel" }).click();
        await scrollWindow(page, [0.58, 1], 2400);
        await goto(page, "/driver/history", /Trip history/);
        break;
      }
      case "accounting": {
        await loginAs(context, page, accounts.accountant, "\\/accounting");
        await showChapter(page, scene);
        await page.getByText(demo.referenceCode, { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
        await scrollWindow(page, [0.2, 0.48, 0.85, 1], 2600);
        await page.getByRole("link", { name: demo.referenceCode, exact: true }).click();
        await page.getByRole("heading", { level: 1 }).waitFor({ state: "visible" });
        await scrollWindow(page, [0.42, 0.82], 2400);
        break;
      }
      case "hospital": {
        await loginAs(context, page, accounts.hospital, "\\/hospital");
        await showChapter(page, scene);
        await page.getByRole("link", { name: "Book a trip for a patient" }).click();
        await page.getByRole("heading", { level: 1, name: /Book a safe, caring ride/ }).waitFor({ state: "visible" });
        await pause(2200);
        await typeSlow(page.getByLabel("Contact person's full name"), "University Hospital Transfer Desk");
        await typeSlow(page.getByLabel("Phone number"), "5195550144");
        await scrollWindow(page, [0.35, 0.68, 0.95], 2400);
        break;
      }
      case "customer-complete": {
        await context.clearCookies();
        await context.addCookies(customerCookies);
        await goto(page, "/portal", /My care journeys/);
        await showChapter(page, scene);
        await page.getByText("Completed", { exact: true }).first().waitFor({ state: "visible", timeout: 30_000 });
        await pause(2500);
        await page.locator(`a[href="/trips/${demo.tripId}"]`).first().click();
        await page.getByRole("heading", { level: 1 }).waitFor({ state: "visible" });
        await scrollWindow(page, [0.25, 0.55, 0.82, 1], 2600);
        await goto(page, "/portal/settings", /Your portal account/);
        await pause(3000);
        break;
      }
      case "mobile-close": {
        await page.setViewportSize({ width: 430, height: 820 });
        await goto(page, "/portal", /My care journeys/);
        await showChapter(page, scene);
        await pause(2600);
        await page.getByRole("button", { name: "Open menu" }).click();
        await pause(3200);
        await page.getByRole("link", { name: "Book a ride" }).first().click();
        await page.getByRole("heading", { level: 1, name: /Book a safe, caring ride/ }).waitFor({ state: "visible" });
        await scrollWindow(page, [0.12, 0.28], 2200);
        await page.setViewportSize({ width: 1440, height: 900 });
        await goto(page, "/", /Safe Journeys/);
        await showChapter(page, { ...scene, number: "COMPLETE", title: "Safe journeys, caring hands", subtitle: "Gray Jay Care — complete connected platform" });
        await pause(4200);
        break;
      }
      default:
        throw new Error(`Unknown scene: ${scene.id}`);
    }
  }

  try {
    for (const scene of scenes) {
      const startedAt = Date.now();
      console.log(`Recording chapter ${scene.number}: ${scene.title}`);
      await perform(scene);
      const elapsed = (Date.now() - startedAt) / 1000;
      if (elapsed < scene.targetDuration) await pause((scene.targetDuration - elapsed) * 1000);
      const actual = (Date.now() - startedAt) / 1000;
      actualDurations.push(actual);
      scene.actualDuration = actual;
    }

    const video = page.video();
    await page.close();
    await context.close();
    const recordedPath = await video.path();
    await browser.close();
    const rawVideo = join(workDir, `walkthrough-raw${recordedPath.endsWith(".webm") ? ".webm" : ".mp4"}`);
    await rename(recordedPath, rawVideo);

    console.log("Aligning narration and composing the final MP4...");
    const paddedAudio = [];
    for (const [index, scene] of scenes.entries()) {
      const output = join(audioDir, `${String(index + 1).padStart(2, "0")}-padded.wav`);
      runBinary("ffmpeg", [
        "-y", "-loglevel", "error", "-i", scene.audioPath,
        "-af", `apad,atrim=duration=${scene.actualDuration.toFixed(3)}`,
        "-ar", "48000", "-ac", "2", output,
      ], { quiet: true });
      paddedAudio.push(output);
    }

    const concatList = join(workDir, "audio-concat.txt");
    await writeFile(concatList, paddedAudio.map((path) => `file '${path.replaceAll("'", "'\\''")}'`).join("\n"));
    const narrationAudio = join(workDir, "narration.wav");
    runBinary("ffmpeg", [
      "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", concatList,
      "-c:a", "pcm_s16le", narrationAudio,
    ], { quiet: true });

    const rawVideoDuration = mediaDuration(rawVideo);
    const alignedAudio = join(workDir, "narration-aligned.wav");
    runBinary("ffmpeg", [
      "-y", "-loglevel", "error", "-i", narrationAudio,
      "-af", `apad,atrim=duration=${rawVideoDuration.toFixed(3)}`,
      "-ar", "48000", "-ac", "2", alignedAudio,
    ], { quiet: true });

    runBinary("ffmpeg", [
      "-y", "-loglevel", "error", "-i", rawVideo, "-i", alignedAudio,
      "-map", "0:v:0", "-map", "1:a:0",
      "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "-shortest", FINAL_VIDEO,
    ]);

    let chapterOffset = 0;
    const chapterLines = scenes.map((scene) => {
      const line = `${formatTimestamp(chapterOffset)}  ${scene.number}. ${scene.title}`;
      chapterOffset += scene.actualDuration;
      return line;
    });
    await writeFile(CHAPTERS, `${chapterLines.join("\n")}\n`);
    await writeFile(TRANSCRIPT, `${scenes.map((scene) => `${scene.number}. ${scene.title}\n\n${scene.narration}`).join("\n\n")}\n`);

    const finalDuration = mediaDuration(FINAL_VIDEO);
    const finalProbe = execFileSync("ffprobe", [
      "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,codec_name",
      "-of", "default=noprint_wrappers=1", FINAL_VIDEO,
    ], { encoding: "utf8" }).trim();
    console.log(`Created ${FINAL_VIDEO}`);
    console.log(`Duration: ${formatTimestamp(finalDuration)}; ${finalProbe.replaceAll("\n", ", ")}`);
    console.log(`Demo cleanup email: ${demo.email}`);
    if (browserErrors.length) console.warn(`Browser console reported ${browserErrors.length} non-fatal messages.`);

    await rm(workDir, { recursive: true, force: true });
  } catch (error) {
    try {
      await page.screenshot({ path: join(OUTPUT_DIR, "walkthrough-recording-failure.png"), fullPage: false });
    } catch {}
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    console.error(`Walkthrough recording failed. Temporary files remain in ${workDir}`);
    throw error;
  }
}

await main();
