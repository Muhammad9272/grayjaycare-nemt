import { z } from "zod";

const email = z.string().trim().toLowerCase().email();

export const createStaffSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    email,
    phone: z.string().trim().min(7).max(30).optional(),
    role: z.enum(["ADMIN", "DISPATCHER", "ACCOUNTANT", "HOSPITAL"]),
    hospitalName: z.string().trim().min(2).max(160).optional(),
    hospitalBillingEmail: email.optional(),
    hospitalAddress: z.string().trim().max(500).optional(),
  })
  .refine((data) => data.role !== "HOSPITAL" || !!data.hospitalName, {
    message: "Hospital name is required for hospital accounts",
    path: ["hospitalName"],
  });

export type CreateStaffInput = z.infer<typeof createStaffSchema>;

export const createVehicleSchema = z.object({
  plateNumber: z.string().trim().toUpperCase().min(2).max(20),
  make: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(80),
  year: z.coerce.number().int().min(1990).max(new Date().getFullYear() + 1),
  type: z.enum(["SEDAN", "MINIVAN", "WHEELCHAIR_VAN", "STRETCHER_VAN"]),
  capacity: z.coerce.number().int().min(1).max(20),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

export const updateVehicleStatusSchema = z.object({
  status: z.enum(["ACTIVE", "MAINTENANCE", "OUT_OF_SERVICE"]),
});
