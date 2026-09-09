import type { Metadata } from "next";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import TidioChat from "@/components/TidioChat";

export const metadata: Metadata = {
  title: "Careers | Gray Jay Care",
  description: "Join the Gray Jay Care patient transportation team in Southwestern Ontario.",
};

const REQUIREMENTS = [
  "At least three years of driving experience",
  "A valid Ontario Full G driver’s licence",
  "Current First Aid and CPR Level C certification",
  "A clean criminal record check",
  "A clean driver’s abstract",
  "Patient transportation or healthcare experience is an asset",
  "Strong communication, reliability and compassion",
];

export default function CareersPage() {
  return (
    <>
      <PublicHeader />
      <main className="bg-[linear-gradient(145deg,#fbf7ff_0%,#fff_48%,#f2ddff_100%)]">
        <section className="mx-auto grid min-h-[620px] max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-[1.08fr_.92fr] lg:px-8">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-primary">Careers</p>
            <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-[1.06] text-[#382f3b] sm:text-6xl">Join the Gray Jay Care Team</h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground">
              We are looking for caring, reliable and professional people who take pride in helping others. Our team supports passengers and families with patience, dignity and dependable service on every journey.
            </p>
            <div className="mt-9 rounded-2xl border border-purple-200 bg-white p-6 shadow-[0_20px_70px_rgba(98,34,132,.10)]">
              <h2 className="text-xl font-bold text-[#382f3b]">Interested in joining us?</h2>
              <p className="mt-2 leading-7 text-muted-foreground">Email your resume and a short introduction to:</p>
              <a className="mt-4 inline-flex rounded-xl bg-primary px-5 py-3 font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary-hover" href="mailto:support@grayjaycare.com">support@grayjaycare.com</a>
            </div>
          </div>
          <div className="rounded-[2rem] border border-purple-200 bg-white/95 p-7 shadow-[0_28px_90px_rgba(98,34,132,.14)] sm:p-10">
            <span className="inline-grid h-14 w-14 place-items-center rounded-2xl bg-[#f1dcff] text-2xl text-primary">✓</span>
            <h2 className="mt-6 font-serif text-3xl text-[#382f3b]">Driver requirements</h2>
            <ul className="mt-6 space-y-4">
              {REQUIREMENTS.map((requirement) => (
                <li className="flex gap-3 leading-6 text-[#584d5c]" key={requirement}>
                  <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-black text-white">✓</span>
                  {requirement}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <Footer />
      <TidioChat />
    </>
  );
}
