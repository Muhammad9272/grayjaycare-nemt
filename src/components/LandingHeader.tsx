"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "@/app/landing.module.css";

const NAV_LINKS = [
  { href: "#home", label: "Home" },
  { href: "#about-us", label: "About Us" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Contact Us" },
  { href: "/careers", label: "Careers" },
];

export default function LandingHeader() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/auth/session", { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<{ user?: { id?: string } }> : null)
      .then((session) => setIsAuthenticated(Boolean(session?.user?.id)))
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="#home" className={styles.brand} aria-label="Gray Jay Care home">
          <Image src="/site/logo-wordmark.png" alt="Gray Jay Care" width={1648} height={445} priority />
        </Link>
        <nav className={styles.desktopNav} aria-label="Primary navigation">
          {NAV_LINKS.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
          {isAuthenticated ? (
            <Link className={styles.headerAccount} href="/dashboard" aria-label="Open account dashboard" title="Open account dashboard">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.7-4 3-6 7-6s6.3 2 7 6" /></svg>
            </Link>
          ) : (
            <Link className={styles.headerSignIn} href="/login">Sign In</Link>
          )}
          <Link className={styles.headerButton} href="/book">Book Now</Link>
        </nav>
        <details className={styles.mobileMenu}>
          <summary aria-label="Open navigation menu"><span /><span /></summary>
          <nav aria-label="Mobile navigation">
            {NAV_LINKS.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
            <Link href={isAuthenticated ? "/dashboard" : "/login"}>{isAuthenticated ? "Dashboard" : "Sign In"}</Link>
            <Link href="/book">Book Now</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
