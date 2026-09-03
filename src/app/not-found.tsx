import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";

export default function NotFoundPage() {
  return (
    <>
      <PublicHeader />
      <main className="grid min-h-[65vh] place-items-center bg-muted px-5 py-16">
        <div className="max-w-lg text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">404 · Page not found</p>
          <h1 className="mt-3 text-4xl font-semibold">This page isn’t here</h1>
          <p className="mt-3 text-muted-foreground">Return to Gray Jay Care or start a new non-emergency transportation request.</p>
          <div className="mt-7 flex justify-center gap-3">
            <Link href="/" className="rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-bold">Home</Link>
            <Link href="/book" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">Book a ride</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
