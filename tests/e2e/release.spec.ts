import "dotenv/config";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { prisma } from "../../src/lib/prisma";
import { createPasswordResetToken } from "../../src/lib/accountTokens";
import { serviceDateTimeInputValue } from "../../src/lib/dates";

test.describe.configure({ mode: "serial" });

const run = `${Date.now()}${randomBytes(2).toString("hex")}`;
const email = (role: string) => `e2e.${run}.${role}@example.test`;
const password = "ReleaseTest123!";
const fixture = {
  admin: { email: email("admin"), id: "" },
  dispatcher: { email: email("dispatcher"), id: "" },
  accountant: { email: email("accountant"), id: "" },
  driver: { email: email("driver"), id: "", profileId: "" },
  customer: { email: email("customer"), id: "", profileId: "" },
  hospital: { email: email("hospital"), id: "", accountId: "" },
  vehicle: { id: "", plate: `T${run.slice(-10)}`.toUpperCase() },
  apiVehicle: { id: "", plate: `A${run.slice(-10)}`.toUpperCase() },
  workflowTrip: { id: "", referenceCode: "" },
  customerTrip: { id: "" },
  hospitalTrip: { id: "" },
  autoAccount: { email: email("autobook"), tripId: "" },
  pendingDriver: { email: email("pending"), id: "" },
  staff: { email: email("staff"), id: "" },
};

async function createFixtures() {
  const passwordHash = await bcrypt.hash(password, 4);
  const [admin, dispatcher, accountant, vehicle, customer, hospital, driver] = await prisma.$transaction([
    prisma.user.create({
      data: { email: fixture.admin.email, passwordHash, role: "SUPER_ADMIN", firstName: "Release", lastName: "Admin" },
    }),
    prisma.user.create({
      data: { email: fixture.dispatcher.email, passwordHash, role: "DISPATCHER", firstName: "Release", lastName: "Dispatcher" },
    }),
    prisma.user.create({
      data: { email: fixture.accountant.email, passwordHash, role: "ACCOUNTANT", firstName: "Release", lastName: "Accountant" },
    }),
    prisma.vehicle.create({
      data: {
        plateNumber: fixture.vehicle.plate,
        make: "Ford",
        model: "Transit E2E",
        year: 2025,
        type: "WHEELCHAIR_VAN",
        capacity: 4,
        odometerKm: 1000,
      },
    }),
    prisma.user.create({
      data: {
        email: fixture.customer.email,
        passwordHash,
        role: "CUSTOMER",
        firstName: "Release",
        lastName: "Customer",
        phone: "5195550101",
        customerProfile: { create: { defaultAddress: "100 Wellington St, London, ON" } },
      },
      include: { customerProfile: true },
    }),
    prisma.user.create({
      data: {
        email: fixture.hospital.email,
        passwordHash,
        role: "HOSPITAL",
        firstName: "Release",
        lastName: "Hospital",
      },
    }),
    prisma.user.create({
      data: {
        email: fixture.driver.email,
        passwordHash,
        role: "DRIVER",
        firstName: "Release",
        lastName: "Driver",
        phone: "5195550102",
      },
    }),
  ]);

  const [hospitalAccount, driverProfile] = await prisma.$transaction([
    prisma.hospitalAccount.create({
      data: {
        name: "Release Test Hospital",
        billingEmail: fixture.hospital.email,
        address: "800 Commissioners Rd E, London, ON",
        primaryContactId: hospital.id,
      },
    }),
    prisma.driver.create({
      data: {
        userId: driver.id,
        licenseNumber: `E2E-${run}`,
        licenseExpiry: new Date("2030-12-31T05:00:00.000Z"),
        verificationStatus: "APPROVED",
        verifiedById: admin.id,
        verifiedAt: new Date(),
        isOnDuty: true,
        assignedVehicleId: vehicle.id,
      },
    }),
  ]);

  fixture.admin.id = admin.id;
  fixture.dispatcher.id = dispatcher.id;
  fixture.accountant.id = accountant.id;
  fixture.vehicle.id = vehicle.id;
  fixture.customer.id = customer.id;
  fixture.customer.profileId = customer.customerProfile!.id;
  fixture.hospital.id = hospital.id;
  fixture.hospital.accountId = hospitalAccount.id;
  fixture.driver.id = driver.id;
  fixture.driver.profileId = driverProfile.id;
}

async function cleanupFixtures() {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: `e2e.${run}.` } },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);
  const [customers, drivers, hospitals] = await Promise.all([
    prisma.customer.findMany({ where: { userId: { in: userIds } }, select: { id: true } }),
    prisma.driver.findMany({ where: { userId: { in: userIds } }, select: { id: true } }),
    prisma.hospitalAccount.findMany({ where: { primaryContactId: { in: userIds } }, select: { id: true } }),
  ]);
  const customerIds = customers.map((item) => item.id);
  const driverIds = drivers.map((item) => item.id);
  const hospitalIds = hospitals.map((item) => item.id);
  const trips = await prisma.trip.findMany({
    where: {
      OR: [
        { guestEmail: { startsWith: `e2e.${run}.` } },
        { customerId: { in: customerIds } },
        { hospitalId: { in: hospitalIds } },
        { bookedById: { in: userIds } },
      ],
    },
    select: { id: true },
  });
  const tripIds = trips.map((trip) => trip.id);
  const invoices = await prisma.invoice.findMany({ where: { tripId: { in: tripIds } }, select: { id: true } });
  const invoiceIds = invoices.map((invoice) => invoice.id);
  const vehicleIds = [fixture.vehicle.id, fixture.apiVehicle.id].filter(Boolean);

  await prisma.$transaction(async (tx) => {
    await tx.payment.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
    await tx.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
    await tx.mileageLog.deleteMany({ where: { OR: [{ tripId: { in: tripIds } }, { driverId: { in: driverIds } }, { vehicleId: { in: vehicleIds } }] } });
    await tx.fuelLog.deleteMany({ where: { OR: [{ driverId: { in: driverIds } }, { vehicleId: { in: vehicleIds } }] } });
    await tx.vehicleInspection.deleteMany({ where: { OR: [{ driverId: { in: driverIds } }, { vehicleId: { in: vehicleIds } }] } });
    await tx.tripStatusEvent.deleteMany({ where: { tripId: { in: tripIds } } });
    await tx.trip.deleteMany({ where: { id: { in: tripIds } } });
    await tx.auditLog.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { entityId: { in: [...tripIds, ...vehicleIds, ...driverIds, ...userIds] } }] } });
    await tx.customer.deleteMany({ where: { id: { in: customerIds } } });
    await tx.driver.deleteMany({ where: { id: { in: driverIds } } });
    await tx.hospitalAccount.deleteMany({ where: { id: { in: hospitalIds } } });
    await tx.user.deleteMany({ where: { id: { in: userIds } } });
    await tx.vehicle.deleteMany({ where: { id: { in: vehicleIds } } });
  }, { timeout: 30_000 });
}

async function login(page: Page, loginEmail: string, expectedPath: RegExp | string) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(loginEmail);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(page).toHaveURL(expectedPath);
}

async function postJson(request: APIRequestContext, path: string, body: unknown) {
  return request.post(path, { data: body, headers: { "Content-Type": "application/json" } });
}

async function fillLongDate(page: Page, label: string, value: string) {
  const [date, time] = value.split("T");
  const [year, month, day] = date.split("-");
  await page.getByLabel(`${label}: day`).selectOption(day);
  await page.getByLabel(`${label}: month`).selectOption(month);
  await page.getByLabel(`${label}: year`).selectOption(year);
  if (time) await page.getByLabel(`${label}: time`).fill(time);
}

function futureIso(hours = 48) {
  return new Date(Date.now() + hours * 60 * 60_000).toISOString();
}

const bookingBody = (overrides: Record<string, unknown> = {}) => ({
  pickupAddress: "100 Wellington Street, London, ON",
  dropoffAddress: "800 Commissioners Road East, London, ON",
  pickupLat: 42.9837,
  pickupLng: -81.2497,
  dropoffLat: 42.9599,
  dropoffLng: -81.2254,
  distanceKm: 8.5,
  waitMinutes: 0,
  mobilityType: "WHEELCHAIR",
  isBariatric: false,
  isOutOfCity: false,
  requiresOxygen: false,
  extraAttendant: false,
  extraAttendantHours: 0,
  scheduledAt: futureIso(),
  guestName: "Release Passenger",
  guestEmail: fixture.customer.email,
  guestPhone: "5195550199",
  isRoundTrip: false,
  ...overrides,
});

test.beforeAll(async () => {
  await cleanupFixtures();
  await createFixtures();
});

test.afterAll(async () => {
  await cleanupFixtures();
  await prisma.$disconnect();
});

test("health, security headers, malformed JSON, and unauthenticated access are safe", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  const healthBody = await health.json();
  expect(healthBody.status).toBe("ok");
  expect(healthBody.database).toBe("connected");
  expect(health.headers()["cache-control"]).toContain("no-store");

  const home = await request.get("/");
  expect(home.status()).toBe(200);
  expect(home.headers()["x-content-type-options"]).toBe("nosniff");
  expect(home.headers()["x-frame-options"]).toBe("DENY");
  expect(home.headers()["x-powered-by"]).toBeUndefined();

  for (const path of [
    "/api/pricing/quote",
    "/api/maps/autocomplete",
    "/api/maps/place",
    "/api/register",
    "/api/register/driver",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/bookings",
  ]) {
    const response = await request.post(path, {
      data: Buffer.from("{broken-json"),
      headers: { "Content-Type": "application/json" },
    });
    expect(response.status(), `${path} must reject malformed JSON without a 500`).toBe(400);
  }

  expect((await postJson(request, "/api/admin/vehicles", {})).status()).toBe(403);
  expect((await postJson(request, "/api/driver/fuel", {})).status()).toBe(403);
  expect((await request.patch("/api/trips/not-a-trip", { data: {} })).status()).toBe(401);
  expect((await request.get("/api/admin/reports/trips-csv")).status()).toBe(403);
});

test("Google address services and the 2026 pricing endpoint respond correctly", async ({ request }) => {
  const token = crypto.randomUUID();
  const autocomplete = await postJson(request, "/api/maps/autocomplete", {
    input: "Victoria Hospital London Ontario",
    sessionToken: token,
  });
  expect(autocomplete.status()).toBe(200);
  const autocompleteBody = await autocomplete.json();
  expect(autocompleteBody.configured).toBe(true);
  expect(Array.isArray(autocompleteBody.suggestions)).toBe(true);

  if (autocompleteBody.suggestions.length > 0) {
    const place = await postJson(request, "/api/maps/place", {
      placeId: autocompleteBody.suggestions[0].placeId,
      sessionToken: token,
    });
    expect(place.status()).toBe(200);
    const details = await place.json();
    expect(details.place.formattedAddress).toBeTruthy();
    expect(typeof details.place.latitude).toBe("number");
  }

  const quote = await postJson(request, "/api/pricing/quote", {
    pickupAddress: "London, ON",
    dropoffAddress: "London, ON",
    distanceKm: 10,
    waitMinutes: 0,
    mobilityType: "WHEELCHAIR",
    isBariatric: false,
    isOutOfCity: false,
    requiresOxygen: false,
    extraAttendant: false,
    extraAttendantHours: 0,
    scheduledAt: "2026-09-02T16:00:00.000Z",
  });
  expect(quote.status()).toBe(200);
  expect(await quote.json()).toMatchObject({
    distanceKm: 10,
    distanceSource: "manual",
    breakdown: { baseFare: 50, distanceCost: 22, total: 72 },
  });
});

test("customer and driver registration validate duplicates and approval", async ({ page, request }) => {
  const customerEmail = email("registered-customer");
  const customer = await postJson(request, "/api/register", {
    firstName: "Registered",
    lastName: "Customer",
    email: customerEmail,
    phone: "5195550111",
    password,
  });
  expect(customer.status()).toBe(200);
  expect((await postJson(request, "/api/register", {
    firstName: "Registered",
    lastName: "Customer",
    email: customerEmail,
    phone: "5195550111",
    password,
  })).status()).toBe(409);

  const driverRegistration = await postJson(request, "/api/register/driver", {
    firstName: "Pending",
    lastName: "Driver",
    email: fixture.pendingDriver.email,
    phone: "5195550112",
    password,
    licenseNumber: `P-${run}`,
    licenseExpiry: "2030-10-01",
  });
  expect(driverRegistration.status()).toBe(200);
  const pending = await prisma.driver.findFirstOrThrow({ where: { user: { email: fixture.pendingDriver.email } } });
  fixture.pendingDriver.id = pending.id;
  expect(pending.verificationStatus).toBe("PENDING");

  await login(page, fixture.admin.email, /\/admin/);
  const approved = await page.context().request.patch(`/api/drivers/${pending.id}/verify`, {
    data: { status: "APPROVED" },
  });
  expect(approved.status()).toBe(200);
  expect((await approved.json()).driver.verificationStatus).toBe("APPROVED");
});

test("revised public content, reviews, contact details, and call actions are present", async ({ page }) => {
  await page.goto("/");
  const globalCallAction = page.getByRole("link", { name: "Call Gray Jay Care at (519) 933-5090" });
  await expect(globalCallAction).toHaveAttribute("href", "tel:+15199335090");
  await expect(globalCallAction).toHaveText("Call Us");
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  await expect(page.getByText("Gray Jay Care was founded by two brothers with years of experience in patient transportation.", { exact: false })).toBeVisible();
  await expect(page.getByText("up to five years of experience", { exact: false })).toHaveCount(0);
  const serviceAreaMap = page.getByTitle("Gray Jay Care service area across Southwestern Ontario");
  await expect(serviceAreaMap).toHaveAttribute("src", /-83\.3000%2C41\.6000%2C-79\.0000%2C44\.4000/);
  await page.getByText("Can pickup or arrival times be delayed?", { exact: true }).click();
  await expect(page.getByText("We do our best to stay on schedule. However, traffic, weather, road conditions, facility delays, or unforeseen circumstances may occasionally affect pickup or arrival times. If a delay occurs, we will keep you informed and provide an update as soon as possible.", { exact: true })).toBeVisible();
  await expect(page.getByText("Whether you have questions about our services or need assistance with booking your transportation, our team is here to help. Please reach out using the contact information below.", { exact: true })).toBeVisible();
  await expect(page.getByText("support@grayjaycare.com", { exact: true })).toBeVisible();
  await expect(page.getByText("support@GrayJayCare.com", { exact: true })).toHaveCount(0);

  for (const removed of ["Nature", "Rodva", "Homepage"]) {
    await expect(page.getByText(removed, { exact: true })).toHaveCount(0);
  }
  const partnerScroller = page.getByRole("region", { name: "Healthcare partners" }).getByLabel("Scrollable healthcare partner logos");
  await expect(partnerScroller).toBeVisible();
  await expect(page.getByAltText("Sienna Senior Living")).toBeVisible();
  await expect(page.getByAltText("Bluewater Health")).toBeVisible();
  await expect(page.getByAltText("Windsor Regional Hospital")).toBeVisible();
  await expect(page.getByRole("link", { name: "View our latest Google reviews" })).toHaveAttribute("href", /share\.google/);
  await expect(page.getByText("9 September 2026", { exact: true })).toBeVisible();
  const firstReview = page.locator("article").filter({ hasText: "Michele Maenpaa" }).first();
  await expect(firstReview).toBeVisible();
  await expect(firstReview).toContainText("It was a very smooth transfer");
  await expect(page.locator("article").filter({ hasText: "Shelley Hunter" })).toHaveCount(1);
  await expect(page.locator("article").filter({ hasText: "Angela Munsterman" })).toHaveCount(1);
  await expect(page.locator("article").filter({ hasText: "Ronald Patterson" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Previous review" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next review" })).toBeVisible();
  const reviewViewport = firstReview.locator("xpath=../..");
  const initialScroll = await reviewViewport.evaluate((element) => element.scrollLeft);
  await page.waitForTimeout(6_300);
  expect(await reviewViewport.evaluate((element) => element.scrollLeft)).toBeGreaterThan(initialScroll);
  const reviewControl = page.getByRole("button", { name: "Pause automatic review movement" });
  await expect(reviewControl).toBeVisible();
  await reviewControl.click();
  await expect(page.getByRole("button", { name: "Resume automatic review movement" })).toBeVisible();

  const callAction = page.getByRole("link", { name: "Call Gray Jay Care at (519) 933-5090" });
  await page.locator("body").click({ position: { x: 1, y: 1 } });
  let callFocused = false;
  for (let index = 0; index < 70 && !callFocused; index += 1) {
    await page.keyboard.press("Tab");
    callFocused = await callAction.evaluate((element) => element === document.activeElement);
  }
  expect(callFocused, "Call Us must be reachable with the keyboard").toBe(true);
  expect(await callAction.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");

  for (const path of ["/book", "/careers", "/login", "/forgot-password", "/register", "/register/driver"]) {
    await page.goto(path);
    const callAction = page.getByRole("link", { name: "Call Gray Jay Care at (519) 933-5090" });
    await expect(callAction).toHaveAttribute("href", "tel:+15199335090");
    await expect(callAction).toHaveText("Call Us");
  }
});

test("booking form shows an error below every missing field and submits from the bottom", async ({ page }) => {
  await page.goto("/book");
  const submitButton = page.getByRole("button", { name: "Request this booking" });
  await expect(page.getByText("Send your request", { exact: true })).toHaveCount(0);
  await submitButton.click();

  for (const message of [
    "Enter the contact person’s full name.",
    "Enter a valid phone number with at least 7 digits.",
    "Enter a valid email address.",
    "Enter the patient’s full name.",
    "Enter the complete pickup address.",
    "Enter the complete drop-off address.",
    "Select the pickup date and time.",
    "Select a payment method.",
  ]) {
    await expect(page.getByText(message, { exact: true })).toBeVisible();
  }

  await expect(page.getByText("Please correct the highlighted fields below.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Contact person's full name")).toBeFocused();
  await expect(page.getByLabel("Contact person's full name")).toHaveAttribute("aria-invalid", "true");
  const requiredLabel = page.getByText("Contact person's full name", { exact: true });
  expect(await requiredLabel.evaluate((element) => getComputedStyle(element, "::after").content)).toContain("*");

  const finalSection = page.getByRole("heading", { name: "Belongings and notes" }).locator("xpath=ancestor::section");
  const submitArea = submitButton.locator("xpath=parent::div");
  const [sectionBox, submitAreaBox, buttonBox] = await Promise.all([finalSection.boundingBox(), submitArea.boundingBox(), submitButton.boundingBox()]);
  expect(sectionBox).not.toBeNull();
  expect(submitAreaBox).not.toBeNull();
  expect(buttonBox).not.toBeNull();
  expect(buttonBox!.y).toBeGreaterThan(sectionBox!.y + sectionBox!.height);
  expect(Math.abs(submitAreaBox!.width - sectionBox!.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(buttonBox!.width - (submitAreaBox!.width - 56))).toBeLessThanOrEqual(2);

  await page.getByLabel("Does the patient require oxygen during transportation?").selectOption("YES");
  await page.getByLabel("Does the patient have a DNR (Do Not Resuscitate) paperwork?").selectOption("YES");
  await page.getByLabel("Will the patient have belongings?").selectOption("YES");
  await page.getByLabel("Payment method").selectOption("INVOICE");
  await submitButton.click();
  for (const message of [
    "Enter an oxygen flow rate between 0.1 and 5 L/min.",
    "Confirm that the required DNR documentation will be available at pickup.",
    "Describe the patient’s belongings.",
    "Choose who should receive the invoice.",
    "Enter the invoice name or organization.",
    "Enter a valid invoice email address.",
    "Enter the billing address.",
  ]) {
    await expect(page.getByText(message, { exact: true })).toBeVisible();
  }
});

test("a public booking creates an account and signs the passenger directly into the portal", async ({ page }) => {
  await page.route("**/api/pricing/quote", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        distanceKm: 8.5,
        distanceSource: "manual",
        breakdown: {
          baseFare: 50,
          distanceCost: 18.7,
          bariatricCharge: 0,
          waitCost: 0,
          oxygenCharge: 0,
          attendantCharge: 0,
          weekendNightHolidayCharge: 0,
          roundTripDiscount: 0,
          subtotal: 68.7,
          tax: 0,
          total: 68.7,
        },
      }),
    });
  });
  await page.goto("/book");
  await page.getByLabel("Contact person's full name").fill("Automatic Account");
  await page.getByLabel("Phone number").fill("5195550113");
  await page.getByLabel("Phone extension").fill("214");
  await page.getByLabel("Email address").fill(fixture.autoAccount.email);
  await page.getByLabel("Pickup address").fill("100 Wellington Street, London, ON");
  await page.getByLabel("Pickup facility / hospital name").fill("Victoria Hospital");
  await page.getByLabel("Pickup department").fill("Endoscopy Unit");
  await page.getByLabel("Pickup room").fill("Room 200");
  await page.getByLabel("Drop-off address").fill("800 Commissioners Road East, London, ON");
  await page.getByLabel("Drop-off facility / hospital name").fill("University Hospital");
  await page.getByLabel("Drop-off department").fill("Imaging");
  await fillLongDate(page, "Pickup date and time", serviceDateTimeInputValue(new Date(Date.now() + 48 * 60 * 60_000)));
  await page.getByLabel("Patient's full name").fill("Automatic Patient");
  await page.getByLabel("Medical Record Number").fill("MRN-2026-001");
  await page.getByLabel("Does the patient weigh more than 250 lb").selectOption("YES");
  await page.getByPlaceholder("Enter weight").fill("280");
  await page.getByLabel("Weight unit").selectOption("LB");
  await page.getByLabel("Will anyone be accompanying the patient?").selectOption("1");
  await page.getByText("Wheelchair transportation with securement support", { exact: true }).click();
  await expect(page.getByRole("radio", { name: /^Wheelchair/ })).toBeChecked();
  await page.getByLabel("Does the patient require special assistance?").selectOption("BARIATRIC");
  await page.getByLabel("Does the patient require oxygen during transportation?").selectOption("YES");
  await page.getByLabel("What is the required oxygen flow rate?").fill("2");
  await page.getByLabel("Are isolation precautions required?").selectOption("YES");
  await page.getByLabel("Isolation type / precautions").fill("Droplet precautions");
  await page.getByLabel("Does the patient have a DNR").selectOption("YES");
  await page.getByText("Please confirm that the required DNR documentation will be available at pickup.").click();
  await page.getByLabel("Payment method").selectOption("OPGT");
  await page.getByLabel("OPGT Client / Account Information").fill("OPGT client 1234");
  await page.getByLabel("Contact Person (if applicable)").fill("Case Worker");
  await page.getByLabel("Will the patient have belongings?").selectOption("YES");
  await page.getByLabel("Describe the belongings").fill("One bag and a walker");
  await expect(page.getByText("Medical documents are available")).toHaveCount(0);
  await expect(page.getByText("Send your request", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Your trip fare", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Request this booking" }).click();
  await expect(page).toHaveURL(/\/portal\?booked=/, { timeout: 30_000 });
  await expect(page.getByText("Your booking is now in the portal.")).toBeVisible();
  await expect(page.getByText("Release Passenger")).toHaveCount(0);

  const created = await prisma.trip.findFirstOrThrow({
    where: { guestEmail: fixture.autoAccount.email },
    include: { customer: { include: { user: true } } },
  });
  fixture.autoAccount.tripId = created.id;
  expect(created.customer?.user.email).toBe(fixture.autoAccount.email);
  expect(created.pickupLat).toBeNull();
  expect(created.contactName).toBe("Automatic Account");
  expect(created.guestName).toBe("Automatic Patient");
  expect(created.medicalRecordNumber).toBe("MRN-2026-001");
  expect(created.pickupDepartment).toBe("Endoscopy Unit");
  expect(created.pickupFacilityName).toBe("Victoria Hospital");
  expect(created.dropoffFacilityName).toBe("University Hospital");
  expect(created.escortCount).toBe(1);
  expect(created.patientOver250).toBe("YES");
  expect(created.passengerWeightValue?.toString()).toBe("280");
  expect(created.passengerWeightUnit).toBe("LB");
  expect(created.specialAssistance).toBe("BARIATRIC");
  expect(created.requiresIsolation).toBe(true);
  expect(created.isolationDetails).toBe("Droplet precautions");
  expect(created.hasDnr).toBe(true);
  expect(created.dnrDocumentationConfirmed).toBe(true);
  expect(created.oxygenLitresPerMinute?.toString()).toBe("2");
  expect(created.hasBelongings).toBe(true);
  expect(created.belongingsRequirement).toBe("YES");
  expect(created.belongingsDescription).toBe("One bag and a walker");
  expect(created.paymentPreference).toBe("OPGT");
  expect(created.opgtClientInformation).toBe("OPGT client 1234");
  expect(created.opgtContactPerson).toBe("Case Worker");
});

test("public, dispatcher, and hospital entry points use the same complete booking flow", async ({ page, browser }) => {
  async function expectCompleteForm(target: Page, channelLabel?: string) {
    await expect(target.getByRole("heading", { level: 1, name: "Book a safe, caring ride" })).toBeVisible();
    const sections = await target.locator("form h2").allTextContents();
    expect(sections.slice(0, 3)).toEqual(["Contact information", "Patient information", "Trip details"]);
    await expect(target.getByLabel("Pickup address")).toBeVisible();
    await expect(target.getByLabel("Pickup date and time: month")).toBeVisible();
    await expect(target.getByLabel("Payment method")).toBeVisible();
    await expect(target.getByText("Who should our dispatcher contact to confirm this booking?", { exact: true })).toBeVisible();
    await expect(target.getByText("Tell us who will be travelling and what assistance they may require.", { exact: true })).toBeVisible();
    await expect(target.getByText("Where and when should we pick up the patient?", { exact: true })).toBeVisible();
    await expect(target.getByLabel("Medical Record Number")).toBeVisible();
    await expect(target.getByText("For hospital and facility bookings only.", { exact: true })).toBeVisible();
    await expect(target.getByLabel("Does the patient weigh more than 250 lb")).toBeVisible();
    await expect(target.getByLabel("Will anyone be accompanying the patient?")).toBeVisible();
    await expect(target.getByText("No wait — call when ready", { exact: true })).toHaveCount(0);
    await expect(target.getByText("Bariatric / special assistance", { exact: true })).toHaveCount(0);
    await expect(target.getByText("Medical documents are available", { exact: true })).toHaveCount(0);
    if (channelLabel) {
      await expect(target.getByText(channelLabel, { exact: true })).toBeVisible();
      await expect(target.getByText("Live estimate", { exact: true })).toBeVisible();
      await expect(target.getByText("Your trip fare", { exact: true })).toBeVisible();
    } else {
      await expect(target.getByText("Send your request", { exact: true })).toHaveCount(0);
      await expect(target.getByText("Your trip fare", { exact: true })).toHaveCount(0);
    }
  }

  await page.goto("/book");
  await expectCompleteForm(page);

  const dispatcherPage = await browser.newPage();
  await login(dispatcherPage, fixture.dispatcher.email, /\/dispatch/);
  await dispatcherPage.getByRole("link", { name: "+ New phone booking" }).click();
  await expect(dispatcherPage).toHaveURL(/\/book\?source=phone/);
  await expectCompleteForm(dispatcherPage, "Dispatcher phone booking");
  await dispatcherPage.close();

  const hospitalPage = await browser.newPage();
  await login(hospitalPage, fixture.hospital.email, /\/hospital/);
  await hospitalPage.getByRole("link", { name: "Book a trip for a patient" }).click();
  await expect(hospitalPage).toHaveURL(/\/book\?source=hospital/);
  await expectCompleteForm(hospitalPage, "Hospital portal booking");
  await hospitalPage.close();
});

test("revised booking conditionals expose only the approved choices and guidance", async ({ page }) => {
  await page.goto("/book");

  await expect(page.getByText("Passenger who can walk independently or with limited assistance", { exact: true })).toBeVisible();
  await expect(page.getByText("Wheelchair transportation with securement support", { exact: true })).toBeVisible();
  await expect(page.getByText("Non-emergency stretcher transportation with trained attendants", { exact: true })).toBeVisible();

  const returnType = page.getByLabel("One-way or return trip?");
  await expect(returnType.locator("option")).toHaveText(["One-way trip", "Wait with the patient and return", "Drop off and return later"]);
  await returnType.selectOption("WAIT_AND_RETURN");
  await expect(page.getByText("What is the approximate waiting time before returning with the patient?", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Hours")).toBeVisible();
  await expect(page.getByLabel("Minutes")).toBeVisible();
  await expect(page.getByText("Waiting time charges may apply based on the actual waiting time.", { exact: true })).toBeVisible();

  const patientOver250 = page.getByLabel("Does the patient weigh more than 250 lb");
  await expect(patientOver250).toHaveValue("NO");
  await expect(page.getByText("Bariatric support is available for wheelchair and stretcher transportation.", { exact: true })).toHaveCount(0);
  await patientOver250.selectOption("YES");
  await expect(page.getByPlaceholder("Enter weight")).toBeVisible();
  await expect(page.getByLabel("Weight unit")).toBeVisible();

  const companionBracket = page.getByLabel("Will anyone be accompanying the patient?");
  await companionBracket.selectOption("3_PLUS");
  const exactCompanions = page.getByLabel("How many people will be accompanying the patient?");
  await exactCompanions.fill("5");
  await expect(companionBracket).toHaveValue("3_PLUS");
  await expect(exactCompanions).toHaveValue("5");

  const assistance = page.getByLabel("Does the patient require special assistance?");
  await assistance.selectOption("STAIR_CHAIR");
  await expect(page.getByLabel("Does the patient weigh 250 lb (113 kg) or less?")).toBeVisible();
  await expect(page.getByText("Stair-chair assistance is available for patients up to 250 lb (113 kg), subject to safe operating conditions.", { exact: true })).toBeVisible();
  await page.getByText("Wheelchair transportation with securement support", { exact: true }).click();
  await expect(page.getByRole("radio", { name: /^Wheelchair/ })).toBeChecked();
  await assistance.selectOption("BARIATRIC");
  await expect(page.getByText("Bariatric support is available for wheelchair and stretcher transportation.", { exact: true })).toBeVisible();
  await expect(page.getByPlaceholder("Enter weight")).toHaveCount(1);
  await patientOver250.selectOption("NO");
  await expect(page.getByPlaceholder("Enter weight")).toHaveCount(1);

  await page.getByLabel("Does the patient require oxygen during transportation?").selectOption("YES");
  const oxygen = page.getByLabel("What is the required oxygen flow rate?");
  await expect(oxygen).toHaveAttribute("max", "5");
  await expect(page.getByText(/maximum of 5 L\/min/)).toBeVisible();
  await page.getByLabel("Does the patient have a DNR").selectOption("YES");
  await expect(page.getByText("Please confirm that the required DNR documentation will be available at pickup.", { exact: true })).toBeVisible();

  const payment = page.getByLabel("Payment method");
  await expect(payment.locator("option")).toHaveText([
    "Select payment preference", "Credit / Debit Card", "E-transfer", "Invoice",
    "Direct Billing / Account", "Insurance", "OPGT", "Other",
  ]);
  await payment.selectOption("CARD");
  await expect(page.getByText("Payment instructions will be provided by Gray Jay Care.", { exact: true })).toBeVisible();
  await payment.selectOption("INVOICE");
  for (const label of ["Who should receive the invoice?", "Invoice To — Full Name / Organization", "Email Address", "Billing Address", "Purchase Order / Reference Number"]) {
    await expect(page.getByLabel(label).first()).toBeVisible();
  }
  await payment.selectOption("DIRECT_BILLING");
  for (const label of ["Account / Organization Name", "Account Number", "Contact Person"]) {
    await expect(page.getByLabel(label).first()).toBeVisible();
  }
  await payment.selectOption("INSURANCE");
  for (const label of ["Insurance Company", "Claim / Reference Number", "Policy Number"]) {
    await expect(page.getByLabel(label)).toBeVisible();
  }
  await payment.selectOption("OPGT");
  await expect(page.getByLabel("OPGT Client / Account Information")).toBeVisible();
  await payment.selectOption("OTHER");
  await expect(page.getByLabel("Please provide payment details")).toBeVisible();
  await expect(page.getByText(/Payment arrangements will be reviewed and confirmed/)).toBeVisible();

  await page.getByLabel("Will the patient have belongings?").selectOption("NOT_SURE");
  await expect(page.getByLabel("Describe the belongings")).toHaveCount(0);
  await page.getByLabel("Will the patient have belongings?").selectOption("YES");
  await expect(page.getByLabel("Describe the belongings")).toBeVisible();
  await expect(page.getByLabel("Additional notes")).toBeVisible();
  await expect(page.getByText(/Medical documents/i)).toHaveCount(0);
});

test("booking API rejects incomplete revised conditionals and persists revised billing data", async ({ request }) => {
  const invalidCases: Array<[string, Record<string, unknown>]> = [
    ["oxygen above maximum", { oxygenRequirement: "YES", oxygenLitresPerMinute: 5.1 }],
    ["DNR without document confirmation", { dnrRequirement: "YES" }],
    ["belongings without description", { belongingsRequirement: "YES" }],
    ["over-250 without weight", { patientOver250: "YES" }],
    ["stair chair without eligibility", { specialAssistance: "STAIR_CHAIR" }],
    ["invoice without recipient details", { paymentPreference: "INVOICE" }],
    ["direct billing without account details", { paymentPreference: "DIRECT_BILLING" }],
    ["insurance without claim details", { paymentPreference: "INSURANCE" }],
    ["OPGT without client details", { paymentPreference: "OPGT" }],
    ["other without payment details", { paymentPreference: "OTHER" }],
  ];
  for (const [name, overrides] of invalidCases) {
    const response = await postJson(request, "/api/bookings", bookingBody(overrides));
    expect(response.status(), name).toBe(400);
  }

  const waitResponse = await postJson(request, "/api/bookings", bookingBody({
    guestEmail: fixture.customer.email,
    isRoundTrip: true,
    returnTripType: "WAIT_AND_RETURN",
    waitMinutes: 75,
  }));
  expect(waitResponse.status()).toBe(201);
  const waitResult = await waitResponse.json();
  expect(waitResult.returnTripId).toBeTruthy();
  const [waitOutbound, waitReturn] = await Promise.all([
    prisma.trip.findUniqueOrThrow({ where: { id: waitResult.tripId } }),
    prisma.trip.findUniqueOrThrow({ where: { id: waitResult.returnTripId } }),
  ]);
  expect(waitOutbound.estimatedWaitMinutes).toBe(75);
  expect(waitReturn.scheduledAt.getTime() - waitOutbound.scheduledAt.getTime()).toBeGreaterThanOrEqual(75 * 60_000);

  const response = await postJson(request, "/api/bookings", bookingBody({
    guestEmail: fixture.customer.email,
    patientOver250: "YES",
    passengerWeightValue: 125,
    passengerWeightUnit: "KG",
    escortCount: 4,
    specialAssistance: "STAIR_CHAIR",
    stairChairWeightEligible: "NO",
    dnrRequirement: "YES",
    dnrDocumentationConfirmed: true,
    belongingsRequirement: "NOT_SURE",
    paymentPreference: "DIRECT_BILLING",
    billingOrganization: "Release Test Hospital",
    billingAccountNumber: "ACC-2026",
    billingContactPerson: "Release Billing",
    purchaseOrderReference: "PO-2026",
  }));
  expect(response.status()).toBe(201);
  const { tripId } = await response.json();
  const trip = await prisma.trip.findUniqueOrThrow({ where: { id: tripId } });
  expect(trip.patientOver250).toBe("YES");
  expect(trip.passengerWeightValue?.toString()).toBe("125");
  expect(trip.passengerWeightUnit).toBe("KG");
  expect(trip.passengerWeightKg).toBe(125);
  expect(trip.escortCount).toBe(4);
  expect(trip.specialAssistance).toBe("STAIR_CHAIR");
  expect(trip.stairChairWeightEligible).toBe("NO");
  expect(trip.dnrDocumentationConfirmed).toBe(true);
  expect(trip.belongingsRequirement).toBe("NOT_SURE");
  expect(trip.paymentPreference).toBe("DIRECT_BILLING");
  expect(trip.billingOrganization).toBe("Release Test Hospital");
  expect(trip.billingAccountNumber).toBe("ACC-2026");
  expect(trip.billingContactPerson).toBe("Release Billing");
  expect(trip.purchaseOrderReference).toBe("PO-2026");

  const staleBranchResponse = await postJson(request, "/api/bookings", bookingBody({
    guestEmail: fixture.customer.email,
    patientOver250: "NO",
    passengerWeightValue: 175,
    passengerWeightUnit: "LB",
    specialAssistance: "NO",
    paymentPreference: "CARD",
    invoiceRecipient: "OTHER",
    invoiceName: "Stale Invoice",
    invoiceEmail: "stale-invoice@example.com",
    billingOrganization: "Stale Billing",
    insuranceCompany: "Stale Insurance",
    opgtClientInformation: "Stale OPGT",
    otherPaymentDetails: "Stale Other",
  }));
  expect(staleBranchResponse.status()).toBe(201);
  const staleBranchResult = await staleBranchResponse.json();
  const normalizedTrip = await prisma.trip.findUniqueOrThrow({ where: { id: staleBranchResult.tripId } });
  expect(normalizedTrip.passengerWeightValue).toBeNull();
  expect(normalizedTrip.passengerWeightUnit).toBeNull();
  expect(normalizedTrip.passengerWeightKg).toBeNull();
  expect(normalizedTrip.invoiceRecipient).toBeNull();
  expect(normalizedTrip.invoiceName).toBeNull();
  expect(normalizedTrip.invoiceEmail).toBeNull();
  expect(normalizedTrip.billingOrganization).toBeNull();
  expect(normalizedTrip.insuranceCompany).toBeNull();
  expect(normalizedTrip.opgtClientInformation).toBeNull();
  expect(normalizedTrip.otherPaymentDetails).toBeNull();
});

test("admin fleet, staff, account controls, pricing form, and driver verification work", async ({ page }) => {
  await login(page, fixture.admin.email, /\/admin/);
  const api = page.context().request;

  const staffResponse = await postJson(api, "/api/admin/staff", {
    firstName: "Temporary",
    lastName: "Accountant",
    email: fixture.staff.email,
    phone: "5195550114",
    role: "ACCOUNTANT",
  });
  expect(staffResponse.status()).toBe(200);
  const staffBody = await staffResponse.json();
  fixture.staff.id = staffBody.userId;
  expect(staffBody.emailSent).toBe(process.env.EXPECT_OUTBOUND_EMAIL === "true");

  const vehicleResponse = await postJson(api, "/api/admin/vehicles", {
    plateNumber: fixture.apiVehicle.plate.toLowerCase(),
    make: "Mercedes-Benz",
    model: "Sprinter Release",
    year: 2025,
    type: "STRETCHER_VAN",
    capacity: 2,
  });
  expect(vehicleResponse.status()).toBe(200);
  const vehicleBody = await vehicleResponse.json();
  fixture.apiVehicle.id = vehicleBody.vehicle.id;
  expect(vehicleBody.vehicle.plateNumber).toBe(fixture.apiVehicle.plate);
  expect((await postJson(api, "/api/admin/vehicles", {
    plateNumber: fixture.apiVehicle.plate,
    make: "Duplicate",
    model: "Vehicle",
    year: 2025,
    type: "MINIVAN",
    capacity: 2,
  })).status()).toBe(409);

  expect((await api.patch(`/api/admin/users/${fixture.admin.id}`, { data: { isActive: false } })).status()).toBe(400);
  expect((await api.patch(`/api/admin/users/${fixture.staff.id}`, { data: { isActive: false } })).status()).toBe(200);
  expect((await api.patch(`/api/admin/users/${fixture.staff.id}`, { data: { isActive: true } })).status()).toBe(200);

  await page.goto("/admin/pricing");
  await expect(page.getByRole("heading", { name: "2026 pricing calculator" })).toBeVisible();
  await page.getByRole("button", { name: "Save active pricing" }).click();
  await expect(page).toHaveURL(/saved=1/);
  await expect(page.getByText("Pricing was saved and is now active in the booking calculator.")).toBeVisible();
});

test("dispatch, assignment guards, driver lifecycle, logs, invoicing, and reports are linked", async ({ page, browser }) => {
  await login(page, fixture.dispatcher.email, /\/dispatch/);
  const dispatchApi = page.context().request;
  const booking = await postJson(dispatchApi, "/api/bookings", bookingBody({ source: "PHONE" }));
  expect(booking.status()).toBe(201);
  const bookingResult = await booking.json();
  fixture.workflowTrip.id = bookingResult.tripId;
  fixture.workflowTrip.referenceCode = bookingResult.referenceCode;

  const invalidJump = await dispatchApi.patch(`/api/trips/${fixture.workflowTrip.id}`, { data: { status: "COMPLETED" } });
  expect(invalidJump.status()).toBe(400);
  await page.goto("/dispatch");
  const tripCard = page.getByRole("link", { name: fixture.workflowTrip.referenceCode }).locator("xpath=ancestor::div[.//select][1]");
  await tripCard.getByLabel(`Driver for ${fixture.workflowTrip.referenceCode}`).selectOption(fixture.driver.profileId);
  await tripCard.getByLabel(`Vehicle for ${fixture.workflowTrip.referenceCode}`).selectOption(fixture.vehicle.id);
  await tripCard.getByRole("button", { name: "Assign trip" }).click();
  await expect(tripCard.getByText("ASSIGNED", { exact: true })).toBeVisible();
  await expect(tripCard.getByText("Assigned by Release Dispatcher", { exact: true })).toBeVisible();

  const storedAssignment = await prisma.trip.findUniqueOrThrow({ where: { id: fixture.workflowTrip.id } });
  expect(storedAssignment.source).toBe("PHONE");
  expect(storedAssignment.driverId).toBe(fixture.driver.profileId);
  expect(storedAssignment.vehicleId).toBe(fixture.vehicle.id);
  expect(storedAssignment.dispatchedById).toBe(fixture.dispatcher.id);

  const adminPage = await browser.newPage();
  await login(adminPage, fixture.admin.email, /\/admin/);
  const blockedVehicle = await adminPage.context().request.patch(`/api/admin/vehicles/${fixture.vehicle.id}`, {
    data: { status: "MAINTENANCE" },
  });
  expect(blockedVehicle.status()).toBe(409);
  await adminPage.close();

  const driverPage = await browser.newPage();
  await login(driverPage, fixture.driver.email, /\/driver/);
  const driverApi = driverPage.context().request;
  expect((await driverApi.patch("/api/drivers/me", { data: { isOnDuty: false } })).status()).toBe(200);
  expect((await driverApi.patch("/api/drivers/me", { data: { isOnDuty: true } })).status()).toBe(200);

  for (const status of ["EN_ROUTE", "ARRIVED", "IN_PROGRESS", "COMPLETED"]) {
    const response = await driverApi.patch(`/api/trips/${fixture.workflowTrip.id}`, { data: { status } });
    expect(response.status(), `driver transition to ${status}`).toBe(200);
  }

  expect((await postJson(driverApi, "/api/driver/fuel", { litres: 35.5, cost: 58.25, odometerKm: 1001 })).status()).toBe(200);
  expect((await postJson(driverApi, "/api/driver/inspections", { passed: true, notes: "Release inspection", odometerKm: 1002 })).status()).toBe(200);
  expect((await postJson(driverApi, "/api/driver/mileage", {
    startKm: 1002,
    endKm: 1010,
    tripId: fixture.workflowTrip.id,
  })).status()).toBe(200);
  await driverPage.close();

  const completed = await prisma.trip.findUniqueOrThrow({
    where: { id: fixture.workflowTrip.id },
    include: { invoice: true, statusEvents: true, mileageLog: true },
  });
  expect(completed.status).toBe("COMPLETED");
  expect(Number(completed.finalFare)).toBeGreaterThan(0);
  expect(completed.invoice?.status).toBe("DRAFT");
  expect(Number(completed.invoice?.total)).toBe(Number(completed.finalFare));
  expect(completed.statusEvents.map((event) => event.status)).toEqual([
    "PENDING",
    "ASSIGNED",
    "EN_ROUTE",
    "ARRIVED",
    "IN_PROGRESS",
    "COMPLETED",
  ]);
  expect(completed.mileageLog).toBeTruthy();

  const accountantPage = await browser.newPage();
  await login(accountantPage, fixture.accountant.email, /\/accounting/);
  const csv = await accountantPage.context().request.get("/api/admin/reports/trips-csv?from=2026-01-01&to=2030-01-01");
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect(await csv.text()).toContain(fixture.workflowTrip.referenceCode);
  await accountantPage.close();

  const adminAfter = await browser.newPage();
  await login(adminAfter, fixture.admin.email, /\/admin/);
  expect((await adminAfter.context().request.patch(`/api/admin/vehicles/${fixture.vehicle.id}`, {
    data: { status: "MAINTENANCE" },
  })).status()).toBe(200);
  expect((await adminAfter.context().request.patch(`/api/admin/vehicles/${fixture.vehicle.id}`, {
    data: { status: "ACTIVE" },
  })).status()).toBe(200);
  await adminAfter.close();
});

test("customer and hospital ownership boundaries and cancellation policy are enforced", async ({ browser }) => {
  const customerPage = await browser.newPage();
  await login(customerPage, fixture.customer.email, /\/portal/);
  const customerApi = customerPage.context().request;
  const ownBooking = await postJson(customerApi, "/api/bookings", bookingBody({
    scheduledAt: futureIso(72),
    guestName: "Customer Passenger",
  }));
  expect(ownBooking.status()).toBe(201);
  fixture.customerTrip.id = (await ownBooking.json()).tripId;
  const cancelled = await customerApi.patch(`/api/trips/${fixture.customerTrip.id}`, {
    data: { status: "CANCELLED", note: "Plans changed" },
  });
  expect(cancelled.status()).toBe(200);
  expect((await cancelled.json()).lateCancellationFeeApplies).toBe(false);
  expect((await customerApi.patch(`/api/trips/${fixture.autoAccount.tripId}`, {
    data: { status: "CANCELLED" },
  })).status()).toBe(403);
  await customerPage.close();

  const hospitalPage = await browser.newPage();
  await login(hospitalPage, fixture.hospital.email, /\/hospital/);
  const hospitalBooking = await postJson(hospitalPage.context().request, "/api/bookings", bookingBody({
    guestName: "Hospital Patient",
    guestEmail: fixture.hospital.email,
    scheduledAt: futureIso(96),
  }));
  expect(hospitalBooking.status()).toBe(201);
  fixture.hospitalTrip.id = (await hospitalBooking.json()).tripId;
  const storedHospitalTrip = await prisma.trip.findUniqueOrThrow({ where: { id: fixture.hospitalTrip.id } });
  expect(storedHospitalTrip.hospitalId).toBe(fixture.hospital.accountId);
  expect(storedHospitalTrip.source).toBe("HOSPITAL_PORTAL");
  await hospitalPage.goto(`/trips/${fixture.hospitalTrip.id}`);
  await expect(hospitalPage.getByRole("heading", { name: /100 Wellington Street/ })).toBeVisible();
  await hospitalPage.close();

  const customerAgain = await browser.newPage();
  await login(customerAgain, fixture.customer.email, /\/portal/);
  await customerAgain.goto(`/trips/${fixture.hospitalTrip.id}`);
  await expect(customerAgain).toHaveURL(/\/portal/);
  await customerAgain.close();
});

test("password reset tokens are one-time and forgot-password does not disclose accounts", async ({ request, page }) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { email: fixture.customer.email } });
  const token = createPasswordResetToken(user);
  const changedPassword = "ChangedRelease123!";
  const reset = await postJson(request, "/api/auth/reset-password", {
    token,
    password: changedPassword,
    confirmPassword: changedPassword,
  });
  expect(reset.status()).toBe(200);
  expect((await reset.json()).email).toBe(fixture.customer.email);
  expect((await postJson(request, "/api/auth/reset-password", {
    token,
    password: changedPassword,
    confirmPassword: changedPassword,
  })).status()).toBe(400);
  expect((await postJson(request, "/api/auth/forgot-password", { email: fixture.customer.email })).status()).toBe(200);
  expect((await postJson(request, "/api/auth/forgot-password", { email: email("does-not-exist") })).status()).toBe(200);

  await page.goto("/login");
  await page.getByLabel("Email address").fill(fixture.customer.email);
  await page.locator('input[name="password"]').fill(changedPassword);
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(page).toHaveURL(/\/portal/);

  await prisma.user.update({
    where: { id: fixture.customer.id },
    data: { passwordHash: await bcrypt.hash(password, 4) },
  });
});

test("all public and role dashboards render in a real desktop browser", async ({ page, browser }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  for (const route of ["/", "/book", "/login", "/register", "/register/driver", "/forgot-password", "/reset-password", "/missing-release-page"]) {
    await page.goto(route);
    await expect(page.locator("h1").first()).toBeVisible();
  }
  expect(pageErrors).toEqual([]);

  const roles: { loginEmail: string; home: RegExp; pages: { path: string; heading: RegExp }[] }[] = [
    {
      loginEmail: fixture.admin.email,
      home: /\/admin/,
      pages: [
        { path: "/admin", heading: /Admin overview/ },
        { path: "/admin/staff", heading: /Users/ },
        { path: "/admin/trips", heading: /All trips/ },
        { path: "/admin/vehicles", heading: /Fleet/ },
        { path: `/admin/vehicles/${fixture.vehicle.id}`, heading: new RegExp(fixture.vehicle.plate) },
        { path: "/admin/pricing", heading: /2026 pricing calculator/ },
        { path: "/dispatch", heading: /Dispatcher board/ },
        { path: "/accounting", heading: /Accounting/ },
        { path: `/trips/${fixture.workflowTrip.id}`, heading: /100 Wellington Street/ },
      ],
    },
    {
      loginEmail: fixture.dispatcher.email,
      home: /\/dispatch/,
      pages: [
        { path: "/dispatch", heading: /Dispatcher board/ },
        { path: `/trips/${fixture.workflowTrip.id}`, heading: /100 Wellington Street/ },
      ],
    },
    {
      loginEmail: fixture.driver.email,
      home: /\/driver/,
      pages: [
        { path: "/driver", heading: /My trips/ },
        { path: "/driver/history", heading: /Trip history/ },
        { path: "/driver/vehicle", heading: /Vehicle & logs/ },
        { path: `/trips/${fixture.workflowTrip.id}`, heading: /100 Wellington Street/ },
      ],
    },
    {
      loginEmail: fixture.customer.email,
      home: /\/portal/,
      pages: [
        { path: "/portal", heading: /My care journeys/ },
        { path: "/portal/settings", heading: /Your portal account/ },
        { path: `/trips/${fixture.customerTrip.id}`, heading: /100 Wellington Street/ },
      ],
    },
    {
      loginEmail: fixture.hospital.email,
      home: /\/hospital/,
      pages: [
        { path: "/hospital", heading: /Release Test Hospital/ },
        { path: `/trips/${fixture.hospitalTrip.id}`, heading: /100 Wellington Street/ },
      ],
    },
    {
      loginEmail: fixture.accountant.email,
      home: /\/accounting/,
      pages: [
        { path: "/accounting", heading: /Accounting/ },
        { path: `/trips/${fixture.workflowTrip.id}`, heading: /100 Wellington Street/ },
      ],
    },
  ];

  for (const role of roles) {
    const rolePage = await browser.newPage();
    const errors: string[] = [];
    rolePage.on("pageerror", (error) => errors.push(error.message));
    await login(rolePage, role.loginEmail, role.home);
    const session = await rolePage.context().request.get("/api/auth/session");
    expect(session.status()).toBe(200);
    expect((await session.json()).user.email).toBe(role.loginEmail);
    for (const target of role.pages) {
      await rolePage.goto(target.path);
      await expect(rolePage.getByRole("heading", { level: 1, name: target.heading })).toBeVisible();
    }
    expect(errors, `${role.loginEmail} browser errors`).toEqual([]);
    await rolePage.close();
  }
});

test("landing, booking, login, and every portal remain usable at a phone viewport", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const mobile = await context.newPage();
  const errors: string[] = [];
  mobile.on("pageerror", (error) => errors.push(error.message));

  for (const route of ["/", "/book", "/careers", "/login", "/register"]) {
    await mobile.goto(route);
    await expect(mobile.locator("h1").first()).toBeVisible();
    await expect(mobile.getByRole("link", { name: "Call Gray Jay Care at (519) 933-5090" })).toBeVisible();
    const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${route} horizontal overflow`).toBeLessThanOrEqual(2);
  }

  await mobile.goto("/book");
  await mobile.getByLabel("Does the patient weigh more than 250 lb").selectOption("YES");
  await mobile.getByLabel("Will anyone be accompanying the patient?").selectOption("3_PLUS");
  await mobile.getByLabel("One-way or return trip?").selectOption("WAIT_AND_RETURN");
  await mobile.getByLabel("Does the patient require oxygen during transportation?").selectOption("YES");
  await mobile.getByLabel("Payment method").selectOption("INVOICE");
  await mobile.getByLabel("Will the patient have belongings?").selectOption("YES");
  const conditionalOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(conditionalOverflow, "mobile conditional booking fields horizontal overflow").toBeLessThanOrEqual(2);

  for (const account of [
    { email: fixture.admin.email, home: /\/admin/ },
    { email: fixture.dispatcher.email, home: /\/dispatch/ },
    { email: fixture.driver.email, home: /\/driver/ },
    { email: fixture.customer.email, home: /\/portal/ },
    { email: fixture.hospital.email, home: /\/hospital/ },
    { email: fixture.accountant.email, home: /\/accounting/ },
  ]) {
    await context.clearCookies();
    await login(mobile, account.email, account.home);
    await expect(mobile.locator("h1").first()).toBeVisible();
    const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${account.email} horizontal overflow`).toBeLessThanOrEqual(2);
  }

  expect(errors).toEqual([]);
  await context.close();
});
