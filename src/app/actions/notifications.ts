"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function marquerNotificationLue(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");

  const { error } = await supabase
    .from("notifications")
    .update({ lu_le: new Date().toISOString() })
    .eq("id", id)
    .eq("destinataire_id", user.id)
    .is("lu_le", null);

  if (error) throw new Error(error.message);
  revalidatePath("/proprietaire/notifications");
}

export async function marquerToutesLues() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");

  const { error } = await supabase
    .from("notifications")
    .update({ lu_le: new Date().toISOString() })
    .eq("destinataire_id", user.id)
    .is("lu_le", null);

  if (error) throw new Error(error.message);
  revalidatePath("/proprietaire/notifications");
}
