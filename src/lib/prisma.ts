import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!, {
  // MariaDB's prepared-statement protocol marks bound strings with a binary
  // collation. That conflicts with Prisma's case-insensitive MySQL columns
  // for LIKE filters on some managed MariaDB versions.
  useTextProtocol: true,
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter,
  transactionOptions: {
    maxWait: 10_000,
    timeout: 30_000,
  },
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
