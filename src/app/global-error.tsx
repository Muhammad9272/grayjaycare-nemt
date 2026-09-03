"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main style={{ display: "grid", minHeight: "100vh", placeItems: "center", padding: 24, fontFamily: "Arial, sans-serif" }}>
          <div style={{ maxWidth: 520, textAlign: "center" }}>
            <h1>Gray Jay Care is temporarily unavailable</h1>
            <p>Please try again. For booking assistance, call (519) 933-5090.</p>
            <button onClick={reset} style={{ padding: "10px 18px", border: 0, borderRadius: 10, color: "white", background: "#922bea" }}>Try again</button>
          </div>
        </main>
      </body>
    </html>
  );
}
