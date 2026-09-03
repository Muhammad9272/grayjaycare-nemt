import type { NavIcon } from "@/components/DashboardShell";

type NavLink = { href: string; label: string; icon: NavIcon };

export const ADMIN_NAV: NavLink[] = [
  { href: "/admin", label: "Overview", icon: "home" },
  { href: "/admin/trips", label: "All trips", icon: "file" },
  { href: "/admin/staff", label: "Staff", icon: "users" },
  { href: "/admin/vehicles", label: "Fleet", icon: "truck" },
  { href: "/admin/pricing", label: "Pricing", icon: "dollar" },
  { href: "/dispatch", label: "Dispatch board", icon: "list" },
  { href: "/accounting", label: "Reports", icon: "dollar" },
];

export const DISPATCHER_NAV: NavLink[] = [{ href: "/dispatch", label: "Dispatch board", icon: "list" }];

export const DRIVER_NAV: NavLink[] = [
  { href: "/driver", label: "My trips", icon: "list" },
  { href: "/driver/history", label: "Trip history", icon: "clock" },
  { href: "/driver/vehicle", label: "Vehicle & logs", icon: "truck" },
];

export const CUSTOMER_NAV: NavLink[] = [
  { href: "/portal", label: "My trips", icon: "list" },
  { href: "/book", label: "Book a ride", icon: "plus" },
  { href: "/portal/settings", label: "Account & security", icon: "users" },
];

export const HOSPITAL_NAV: NavLink[] = [{ href: "/hospital", label: "Patient trips", icon: "building" }];

export const ACCOUNTANT_NAV: NavLink[] = [{ href: "/accounting", label: "Reports", icon: "dollar" }];

export function navForRole(role: string): NavLink[] {
  switch (role) {
    case "SUPER_ADMIN":
    case "ADMIN":
      return ADMIN_NAV;
    case "DISPATCHER":
      return DISPATCHER_NAV;
    case "DRIVER":
      return DRIVER_NAV;
    case "CUSTOMER":
      return CUSTOMER_NAV;
    case "HOSPITAL":
      return HOSPITAL_NAV;
    case "ACCOUNTANT":
      return ACCOUNTANT_NAV;
    default:
      return [];
  }
}
