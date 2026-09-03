import { PrismaClient, Role, VehicleType } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "Password123!";

async function ensureUser(input: {
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  phone?: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) return existing;

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      role: input.role,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      isActive: true,
    },
  });
  console.log(`Created ${input.role} user: ${input.email}`);
  return user;
}

async function main() {
  const pricing = await prisma.pricingRule.findFirst({ where: { isActive: true } });
  if (!pricing) {
    // Gray Jay Care — Updated Price List 2026
    await prisma.pricingRule.create({
      data: {
        name: "Default",
        isActive: true,

        wheelchairInCityBase: 50,
        wheelchairInCityPerKm: 2.2,
        wheelchairOutCityBase: 60,
        wheelchairOutCityPerKmUnder100: 2.2,
        wheelchairOutCityPerKmOver100: 2.0,

        stretcherInCityBase: 120,
        stretcherInCityPerKm: 3.2,
        stretcherOutCityBase: 120,
        stretcherOutCityPerKmUnder100: 3.2,
        stretcherOutCityPerKmOver100: 3.0,

        bariatricAdditionalCharge: 100,
        bariatricPerKm: 3.5,

        weekendNightHolidayFlat: 50,
        extraAttendantPerHour: 50,
        oxygenFlat: 10,
        wheelchairWaitPerHour: 45,
        stretcherWaitPerHour: 75,

        roundTripDiscountPct: 10,
        lateCancellationFee: 120,
        cancellationWindowHours: 3,

        taxRatePct: 0,
        nightStartHour: 21,
        nightEndHour: 6,
      },
    });
    console.log("Created default pricing rule (Gray Jay Care 2026 rate sheet)");
  }

  await ensureUser({
    email: process.env.SEED_ADMIN_EMAIL ?? "admin@grayjaycare.ca",
    role: Role.SUPER_ADMIN,
    firstName: "Gray Jay",
    lastName: "Admin",
  });

  await ensureUser({
    email: "dispatcher@grayjaycare.ca",
    role: Role.DISPATCHER,
    firstName: "Dana",
    lastName: "Dispatcher",
  });

  await ensureUser({
    email: "accountant@grayjaycare.ca",
    role: Role.ACCOUNTANT,
    firstName: "Alex",
    lastName: "Accountant",
  });

  let vehicleOne = await prisma.vehicle.findUnique({ where: { plateNumber: "GJC-001" } });
  if (!vehicleOne) {
    vehicleOne = await prisma.vehicle.create({
      data: {
        plateNumber: "GJC-001",
        make: "Ford",
        model: "Transit",
        year: 2022,
        type: VehicleType.WHEELCHAIR_VAN,
        capacity: 4,
      },
    });
    console.log("Created vehicle GJC-001");
  }

  const vehicleTwo = await prisma.vehicle.findUnique({ where: { plateNumber: "GJC-002" } });
  if (!vehicleTwo) {
    await prisma.vehicle.create({
      data: {
        plateNumber: "GJC-002",
        make: "Dodge",
        model: "Grand Caravan",
        year: 2021,
        type: VehicleType.MINIVAN,
        capacity: 5,
      },
    });
    console.log("Created vehicle GJC-002");
  }

  const vehicleThree = await prisma.vehicle.findUnique({ where: { plateNumber: "GJC-003" } });
  if (!vehicleThree) {
    await prisma.vehicle.create({
      data: {
        plateNumber: "GJC-003",
        make: "Mercedes-Benz",
        model: "Sprinter",
        year: 2023,
        type: VehicleType.STRETCHER_VAN,
        capacity: 2,
      },
    });
    console.log("Created vehicle GJC-003");
  }

  const approvedDriverUser = await ensureUser({
    email: "driver@grayjaycare.ca",
    role: Role.DRIVER,
    firstName: "Dave",
    lastName: "Driver",
  });
  const existingApprovedDriver = await prisma.driver.findUnique({ where: { userId: approvedDriverUser.id } });
  if (!existingApprovedDriver) {
    await prisma.driver.create({
      data: {
        userId: approvedDriverUser.id,
        licenseNumber: "ON-1234567",
        licenseExpiry: new Date("2028-01-01"),
        verificationStatus: "APPROVED",
        verifiedAt: new Date(),
        isOnDuty: true,
        assignedVehicleId: vehicleOne.id,
      },
    });
    console.log("Created approved+on-duty driver: driver@grayjaycare.ca");
  }

  const pendingDriverUser = await ensureUser({
    email: "driver.pending@grayjaycare.ca",
    role: Role.DRIVER,
    firstName: "Priya",
    lastName: "Pending",
  });
  const existingPendingDriver = await prisma.driver.findUnique({ where: { userId: pendingDriverUser.id } });
  if (!existingPendingDriver) {
    await prisma.driver.create({
      data: {
        userId: pendingDriverUser.id,
        licenseNumber: "ON-7654321",
        licenseExpiry: new Date("2027-06-01"),
        verificationStatus: "PENDING",
      },
    });
    console.log("Created pending driver: driver.pending@grayjaycare.ca (awaiting admin verification)");
  }

  const customerUser = await ensureUser({
    email: "customer@grayjaycare.ca",
    role: Role.CUSTOMER,
    firstName: "Cara",
    lastName: "Customer",
    phone: "5195551000",
  });
  const existingCustomer = await prisma.customer.findUnique({ where: { userId: customerUser.id } });
  if (!existingCustomer) {
    await prisma.customer.create({
      data: {
        userId: customerUser.id,
        defaultAddress: "100 Wellington St, London, ON",
      },
    });
    console.log("Created customer profile: customer@grayjaycare.ca");
  }

  const hospitalUser = await ensureUser({
    email: "hospital@grayjaycare.ca",
    role: Role.HOSPITAL,
    firstName: "Hank",
    lastName: "Hospital",
  });
  const existingHospital = await prisma.hospitalAccount.findFirst({ where: { primaryContactId: hospitalUser.id } });
  if (!existingHospital) {
    await prisma.hospitalAccount.create({
      data: {
        name: "Riverside Health Centre",
        billingEmail: "hospital@grayjaycare.ca",
        address: "800 Riverside Dr, London, ON",
        primaryContactId: hospitalUser.id,
      },
    });
    console.log("Created hospital account: hospital@grayjaycare.ca");
  }

  console.log("\nSeeded staff and test accounts are ready.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
