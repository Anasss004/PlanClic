"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, LogOut } from "lucide-react";
import { arreterImpersonation } from "@/app/actions/impersonation";
import { useToast } from "@/components/ui/Toast";

export default function BanniereImpersonation({
  nomAgence,
}: {
  nomAgence: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function quitter() {
    startTransition(async () => {
      try {
        await arreterImpersonation();
        router.push("/admin/dashboard");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-2 bg-[#7b1fa2] px-6 py-2.5 text-sm text-white">
      <span className="flex items-center gap-2">
        <Eye size={15} strokeWidth={2} />
        Vous visualisez en tant que <strong>{nomAgence}</strong>
        <span className="hidden opacity-80 sm:inline">· lecture seule</span>
      </span>
      <button
        onClick={quitter}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1 text-xs font-semibold transition hover:bg-white/25 disabled:opacity-50"
      >
        <LogOut size={12} strokeWidth={2.5} />
        Quitter
      </button>
    </div>
  );
}
