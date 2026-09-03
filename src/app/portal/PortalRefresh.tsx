"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PortalRefresh() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 20_000);
    return () => clearInterval(interval);
  }, [router]);

  function refresh() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 700);
  }

  return (
    <button
      type="button"
      onClick={refresh}
      disabled={refreshing}
      className="rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-muted-foreground shadow-sm hover:border-primary hover:text-primary disabled:opacity-60"
    >
      {refreshing ? "Refreshing..." : "Refresh status"}
    </button>
  );
}
