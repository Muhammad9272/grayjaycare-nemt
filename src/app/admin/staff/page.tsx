import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { navForRole } from "@/lib/navLinks";
import type { Prisma, Role } from "@/generated/prisma/client";
import CreateStaffForm from "./CreateStaffForm";
import UserRow from "./UserRow";

const ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "DISPATCHER", "DRIVER", "CUSTOMER", "HOSPITAL", "ACCOUNTANT"];

export default async function AdminStaffPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) redirect("/login");

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const role = params.role && ROLES.includes(params.role as Role) ? (params.role as Role) : undefined;

  const where: Prisma.UserWhereInput = {
    ...(role ? { role } : {}),
    ...(q
      ? {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : {}),
  };

  const users = await prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <DashboardShell
      role={session.user.role}
      name={`${session.user.firstName} ${session.user.lastName}`}
      navLinks={navForRole(session.user.role)}
    >
      <h1 className="text-2xl font-semibold">Users</h1>
      <p className="mt-1 text-sm text-muted-foreground">{users.length} account{users.length === 1 ? "" : "s"}</p>

      <form method="get" className="mt-6 flex flex-wrap gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search name or email..."
          className="min-w-[220px] flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
        />
        <select
          name="role"
          defaultValue={role ?? ""}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover"
        >
          Search
        </button>
      </form>

      <div className="mt-6 space-y-2">
        {users.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No users match your search.
          </p>
        )}
        {users.map((u) => (
          <UserRow
            key={u.id}
            id={u.id}
            name={`${u.firstName} ${u.lastName}`}
            email={u.email}
            role={u.role}
            isActive={u.isActive}
            isSelf={u.id === session.user.id}
            canManage={u.role !== "SUPER_ADMIN" || session.user.role === "SUPER_ADMIN"}
          />
        ))}
      </div>

      <h2 className="mt-10 text-lg font-semibold">Add staff account</h2>
      <div className="mt-4">
        <CreateStaffForm canCreateAdmin={session.user.role === "SUPER_ADMIN"} />
      </div>
    </DashboardShell>
  );
}
