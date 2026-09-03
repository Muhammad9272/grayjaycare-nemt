import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { navForRole } from "@/lib/navLinks";
import DashboardShell from "@/components/DashboardShell";
import PasswordLinkButton from "./PasswordLinkButton";

export default async function CustomerSettingsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CUSTOMER") redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, phone: true, emailVerified: true },
  });
  if (!user) redirect("/login");

  return (
    <DashboardShell role={session.user.role} name={`${session.user.firstName} ${session.user.lastName}`} navLinks={navForRole(session.user.role)}>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Account & security</p>
      <h1 className="mt-2 text-3xl font-semibold">Your portal account</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">Manage how you securely return to booking information and live trip status.</p>

      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Contact details</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div><dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Email</dt><dd className="mt-1 font-medium">{user.email}</dd></div>
            <div><dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Phone</dt><dd className="mt-1 font-medium">{user.phone ?? "Not provided"}</dd></div>
            <div><dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Email security</dt><dd className="mt-1 font-medium">{user.emailVerified ? "Verified" : "Password setup pending"}</dd></div>
          </dl>
        </section>
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Password</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">We’ll email a secure one-hour link. Passwords are never included in email messages.</p>
          <div className="mt-5"><PasswordLinkButton email={user.email} /></div>
        </section>
      </div>
    </DashboardShell>
  );
}
