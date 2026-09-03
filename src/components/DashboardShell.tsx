"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Logo from "./Logo";
import { signOutAction } from "@/lib/actions";
import {
  HomeIcon,
  UsersIcon,
  TruckIcon,
  ListIcon,
  DollarIcon,
  BuildingIcon,
  ClockIcon,
  MenuIcon,
  XIcon,
  FileTextIcon,
  PlusIcon,
} from "./icons";
import styles from "./DashboardShell.module.css";

const ICON_MAP = {
  home: HomeIcon,
  users: UsersIcon,
  truck: TruckIcon,
  list: ListIcon,
  dollar: DollarIcon,
  building: BuildingIcon,
  clock: ClockIcon,
  file: FileTextIcon,
  plus: PlusIcon,
};

export type NavIcon = keyof typeof ICON_MAP;

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  DISPATCHER: "Dispatcher",
  DRIVER: "Driver",
  CUSTOMER: "Customer",
  HOSPITAL: "Hospital",
  ACCOUNTANT: "Accountant",
};

export default function DashboardShell({
  role,
  name,
  navLinks,
  children,
}: {
  role: string;
  name?: string;
  navLinks?: { href: string; label: string; icon: NavIcon }[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = navLinks ?? [];
  const initials = name
    ? name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "GJ";

  return (
    <div className={styles.shell}>
      {mobileOpen && (
        <div className={styles.overlay} onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ""}`}
      >
        <div className={styles.brandRow}>
          <span className={styles.logoCard}><Logo /></span>
          <button className={styles.closeButton} onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <p className={styles.portalLabel}>Care operations portal</p>

        <nav className={styles.nav} aria-label="Dashboard navigation">
          {links.map((link) => {
            const Icon = ICON_MAP[link.icon];
            const active =
              link.href === "/admin"
                ? pathname === "/admin"
                : pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
              >
                <span className={styles.iconBox}><Icon className="h-4.5 w-4.5" /></span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.profileArea}>
          <div className={styles.profileRow}>
            <span className={styles.avatar}>{initials}</span>
            <span className={styles.profileCopy}>
              {name && <strong>{name}</strong>}
              <small>{ROLE_LABELS[role] ?? role}</small>
            </span>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className={styles.signOut}
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className={styles.contentColumn}>
        <header className={styles.mobileHeader}>
          <button className={styles.menuButton} onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <MenuIcon className="h-5 w-5" />
          </button>
          <Logo />
          <span className={styles.mobileAvatar}>{initials}</span>
        </header>
        <header className={styles.desktopHeader}>
          <div>
            <p>Gray Jay Care</p>
            <span>Safe journeys, caring hands.</span>
          </div>
          <div className={styles.headerActions}>
            <Link href="/" className={styles.websiteLink}>View website</Link>
            <Link href="/book" className={styles.quickBook}>+ New booking</Link>
          </div>
        </header>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
