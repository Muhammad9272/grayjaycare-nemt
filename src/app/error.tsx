"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Application route failed", error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-muted px-5">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Gray Jay Care</p>
        <h1 className="mt-3 text-3xl font-semibold">We couldn’t load this page</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Your information is safe. Try the page again, or call (519) 933-5090 if you need booking assistance.</p>
        <button onClick={reset} className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-hover">Try again</button>
      </div>
    </main>
  );
}
