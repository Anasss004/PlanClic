"use client";

import { useTransition } from "react";
import { changerRole } from "@/app/actions/admin";
import { useToast } from "@/components/ui/Toast";

const ROLES = ["client", "proprietaire", "support", "admin"] as const;

export default function SelecteurRole({
  userId,
  roleActuel,
}: {
  userId: string;
  roleActuel: string;
}) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  function changer(role: (typeof ROLES)[number]) {
    if (role === roleActuel) return;
    if (!confirm(`Changer le rôle vers "${role}" ?`)) return;
    startTransition(async () => {
      try {
        await changerRole(userId, role);
        toast.success(`Rôle changé en "${role}".`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  return (
    <select
      disabled={isPending}
      defaultValue={roleActuel}
      onChange={(e) => changer(e.target.value as (typeof ROLES)[number])}
      className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 outline-none disabled:opacity-50"
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </select>
  );
}
