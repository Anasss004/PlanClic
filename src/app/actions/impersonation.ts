"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { exigerStaffAction } from "@/lib/admin/auth";
import { COOKIE_IMPERSONATION } from "@/lib/impersonation";

export async function demarrerImpersonation(proprietaireId: string) {
  await exigerStaffAction();
  const supabase = await createClient();

  const { data: agence } = await supabase
    .from("proprietaires")
    .select("id")
    .eq("id", proprietaireId)
    .single();
  if (!agence) throw new Error("Agence introuvable.");

  const { error } = await supabase.rpc("admin_journaliser_impersonation", {
    p_proprietaire_id: proprietaireId,
    p_evenement: "debut",
  });
  if (error) throw new Error(error.message);

  const jar = await cookies();
  jar.set(COOKIE_IMPERSONATION, proprietaireId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 2, // 2 h max
  });
}

export async function arreterImpersonation() {
  const jar = await cookies();
  const cible = jar.get(COOKIE_IMPERSONATION)?.value;

  if (cible) {
    const supabase = await createClient();
    // best-effort : on journalise la fin, sans bloquer la sortie
    try {
      await supabase.rpc("admin_journaliser_impersonation", {
        p_proprietaire_id: cible,
        p_evenement: "fin",
      });
    } catch {
      // ignore
    }
  }

  jar.delete(COOKIE_IMPERSONATION);
}
