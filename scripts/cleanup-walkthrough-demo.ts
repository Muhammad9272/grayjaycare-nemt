import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { prisma } from "../src/lib/prisma";

type Manifest = { email?: string; tripId?: string; referenceCode?: string };

const manifestPath = resolve(process.env.DEMO_RUN_MANIFEST || "artifacts/client-demo/walkthrough-demo-run.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
const demoEmail = (process.env.DEMO_EMAIL || manifest.email || "").trim().toLowerCase();

if (!demoEmail.startsWith("walkthrough.") || !demoEmail.endsWith("@example.test")) {
  throw new Error("Refusing cleanup: the demo email must match walkthrough.*@example.test.");
}

const user = await prisma.user.findUnique({
  where: { email: demoEmail },
  include: { customerProfile: true },
});
const customerId = user?.customerProfile?.id;
const trips = await prisma.trip.findMany({
  where: {
    OR: [
      { guestEmail: demoEmail },
      ...(customerId ? [{ customerId }] : []),
    ],
  },
  select: { id: true },
});
const tripIds = trips.map((trip) => trip.id);
const invoices = await prisma.invoice.findMany({ where: { tripId: { in: tripIds } }, select: { id: true } });
const invoiceIds = invoices.map((invoice) => invoice.id);

await prisma.$transaction(async (tx) => {
  await tx.payment.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
  await tx.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
  await tx.mileageLog.deleteMany({ where: { tripId: { in: tripIds } } });
  await tx.tripStatusEvent.deleteMany({ where: { tripId: { in: tripIds } } });
  await tx.auditLog.deleteMany({
    where: {
      OR: [
        { entityId: { in: tripIds } },
        ...(user ? [{ userId: user.id }] : []),
      ],
    },
  });
  await tx.trip.deleteMany({ where: { id: { in: tripIds } } });
  if (customerId) await tx.customer.delete({ where: { id: customerId } });
  if (user) await tx.user.delete({ where: { id: user.id } });
}, { timeout: 30_000 });

const remainingTrips = await prisma.trip.count({ where: { guestEmail: demoEmail } });
const remainingUsers = await prisma.user.count({ where: { email: demoEmail } });
await prisma.$disconnect();

console.log(JSON.stringify({
  email: demoEmail,
  removedTrips: tripIds.length,
  removedUser: Boolean(user),
  remainingTrips,
  remainingUsers,
}));
