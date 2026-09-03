import Link from "next/link";
import Logo from "./Logo";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/#about-us", label: "About Us" },
  { href: "/#faq", label: "FAQ" },
  { href: "/#contact", label: "Contact Us" },
];

export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-purple-100 bg-white/95 shadow-[0_8px_30px_rgba(77,24,105,0.05)] backdrop-blur">
      <div className="mx-auto flex h-[74px] max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground/75 hover:text-primary">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="tel:+15199335090"
            className="hidden text-sm font-semibold text-primary hover:text-primary-hover md:block"
          >
            (519) 933-5090
          </Link>
          <Link href="/login" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted sm:block">
            Sign in
          </Link>
          <Link
            href="/book"
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:bg-primary-hover"
          >
            Book Now
          </Link>
        </div>
      </div>
    </header>
  );
}
