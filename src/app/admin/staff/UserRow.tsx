"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function UserRow({
  id,
  name,
  email,
  role,
  isActive,
  isSelf,
  canManage,
}: {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  isSelf: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(typeof data?.error === "string" ? data.error : "Account status could not be updated.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3 text-sm shadow-sm">
      <div>
        <p className="font-medium">{name}</p>
        <p className="text-muted-foreground">{email}</p>
      </div>
      {error && <p className="basis-full text-xs text-danger-fg">{error}</p>}
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{role}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            isActive ? "bg-success-bg text-success-fg" : "bg-danger-bg text-danger-fg"
          }`}
        >
          {isActive ? "Active" : "Deactivated"}
        </span>
        {!isSelf && canManage && (
          <button
            onClick={toggle}
            disabled={busy}
            className="rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
          >
            {isActive ? "Deactivate" : "Activate"}
          </button>
        )}
      </div>
    </div>
  );
}
