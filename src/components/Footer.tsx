import Link from "next/link";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="border-t border-purple-200 bg-[#f8edff]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex flex-col justify-between gap-8 sm:flex-row">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">
              Safe, professional and compassionate non-emergency medical transportation across Southwestern Ontario.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Ride with us</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/book" className="hover:text-foreground">
                    Book a ride
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="hover:text-foreground">
                    Create an account
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Partners</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/register/driver" className="hover:text-foreground">
                    Drive with us
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-foreground">
                    Hospital sign in
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Contact</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>(519) 933-5090</li>
                <li>support@grayjaycare.com</li>
                <li>Available 24/7</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Gray Jay Care. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
