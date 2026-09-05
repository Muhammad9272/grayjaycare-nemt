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
  await page.getByLabel("Pickup department").fill("Endoscopy Unit");
  await page.getByLabel("Pickup room").fill("Room 200");
  await page.getByLabel("Drop-off address").fill("800 Commissioners Road East, London, ON");
  await page.getByLabel("Drop-off department").fill("Imaging");
  await fillLongDate(page, "Pickup date and time", serviceDateTimeInputValue(new Date(Date.now() + 48 * 60 * 60_000)));
  await page.getByLabel("Patient's full name").fill("Automatic Patient");
  await page.getByLabel("Medical record number").fill("MRN-2026-001");
  await page.getByLabel("People escorting the patient").selectOption("1");
  await page.getByLabel("Isolation precautions?").selectOption("yes");
  await page.getByLabel("DNR paperwork available?").selectOption("yes");
  await page.getByLabel("Payment preference").selectOption("CARD");
  await page.getByText("Medical documents are available").click();
  await expect(page.getByText("$68.70", { exact: true }).first()).toBeVisible();
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
  expect(created.escortCount).toBe(1);
  expect(created.requiresIsolation).toBe(true);
  expect(created.hasDnr).toBe(true);
  expect(created.paymentPreference).toBe("CARD");
  expect(created.medicalDocumentsAvailable).toBe(true);
});

test("public, dispatcher, and hospital entry points use the same complete booking flow", async ({ page, browser }) => {
  async function expectCompleteForm(target: Page, channelLabel?: string) {
    await expect(target.getByRole("heading", { level: 1, name: "Book a safe, caring ride" })).toBeVisible();
    const sections = await target.locator("form h2").allTextContents();
    expect(sections.slice(0, 3)).toEqual(["Contact information", "Trip details", "Patient information"]);
    await expect(target.getByText("Live estimate", { exact: true })).toBeVisible();
    await expect(target.getByText("Your trip fare", { exact: true })).toBeVisible();
    await expect(target.getByLabel("Pickup address")).toBeVisible();
    await expect(target.getByLabel("Pickup date and time: month")).toBeVisible();
    await expect(target.getByLabel("Payment preference")).toBeVisible();
    if (channelLabel) await expect(target.getByText(channelLabel, { exact: true })).toBeVisible();
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

  for (const route of ["/", "/book", "/login"]) {
    await mobile.goto(route);
    await expect(mobile.locator("h1").first()).toBeVisible();
    const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${route} horizontal overflow`).toBeLessThanOrEqual(2);
  }

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
