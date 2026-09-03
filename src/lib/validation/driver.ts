import { z } from "zod";

export const inspectionSchema = z.object({
  passed: z.boolean(),
  notes: z.string().trim().max(2000).optional(),
  odometerKm: z.coerce.number().int().min(0).max(10_000_000),
});

export const mileageSchema = z.object({
  startKm: z.coerce.number().int().min(0).max(10_000_000),
  endKm: z.coerce.number().int().min(0).max(10_000_000),
  tripId: z.string().trim().min(1).max(191).optional(),
});

export const fuelSchema = z.object({
  litres: z.coerce.number().positive().max(1000),
  cost: z.coerce.number().positive().max(100_000),
  odometerKm: z.coerce.number().int().min(0).max(10_000_000),
});
