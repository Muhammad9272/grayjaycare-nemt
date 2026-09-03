import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatServiceDate, parseTorontoDate, serviceDateInputValue } from "@/lib/dates";

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const today = new Date();
  const defaultFrom = new Date(today.getTime() - 30 * 24 * 60 * 60_000);
  const fromValue = url.searchParams.get("from") ?? serviceDateInputValue(defaultFrom);
  const toValue = url.searchParams.get("to") ?? serviceDateInputValue(today);
  const gte = parseTorontoDate(fromValue);
  const lt = parseTorontoDate(toValue, true);
  if (!gte || !lt || gte >= lt) return NextResponse.json({ error: "Invalid report date range." }, { status: 400 });

  const trips = await prisma.trip.findMany({
    where: { status: "COMPLETED", updatedAt: { gte, lt } },
    orderBy: { updatedAt: "desc" },
    include: { customer: { include: { user: true } }, driver: { include: { user: true } }, vehicle: true, hospital: true },
  });

  const header = [
    "Reference", "Completed", "Patient", "MRN", "Booking contact", "Hospital", "Driver", "Vehicle",
    "Pickup", "Pickup unit", "Dropoff", "Dropoff unit", "Isolation", "DNR", "Oxygen", "Escorts",
    "Distance (km)", "Fare",
  ];
  const rows = trips.map((t) => [
    t.referenceCode,
    formatServiceDate(t.updatedAt),
    t.guestName ?? (t.customer ? `${t.customer.user.firstName} ${t.customer.user.lastName}` : ""),
    t.medicalRecordNumber ?? "",
    t.contactName ?? "",
    t.hospital?.name ?? "",
    t.driver ? `${t.driver.user.firstName} ${t.driver.user.lastName}` : "",
    t.vehicle?.plateNumber ?? "",
    t.pickupAddress,
    [t.pickupDepartment, t.pickupRoom].filter(Boolean).join(" / "),
    t.dropoffAddress,
    [t.dropoffDepartment, t.dropoffRoom].filter(Boolean).join(" / "),
    t.requiresIsolation ? "Yes" : "No",
    t.hasDnr ? "Yes" : "No",
    t.requiresOxygen ? "Yes" : "No",
    String(t.escortCount),
    t.distanceKm?.toString() ?? "",
    Number(t.finalFare ?? t.estimatedFare ?? 0).toFixed(2),
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="trips-${fromValue}-to-${toValue}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
