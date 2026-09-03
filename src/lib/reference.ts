import { randomBytes } from "node:crypto";

export function generateReferenceCode(date: Date = new Date()): string {
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = randomBytes(5).toString("hex").slice(0, 8).toUpperCase();
  return `GJC-${datePart}-${randomPart}`;
}
