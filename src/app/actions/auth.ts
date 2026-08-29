"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { limiterDebit } from "@/lib/rate-limit";

export async function inscrire(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string; // "client" ou "proprietaire"
  const nom = formData.get("nom") as string;
  const prenom = formData.get("prenom") as string;
  const telephone = formData.get("telephone") as string;

  // Limite basique par email : 5 tentatives d'inscription / heure.
  // (Le vrai filet de sécurité reste le rate limit natif de Supabase
  // Auth, actif côté serveur Supabase indépendamment de ce code —
  // voir Dashboard > Authentication > Rate Limits.)
  const debit = limiterDebit(`inscription:${email}`, 5, 60 * 60 * 1000);
  if (!debit.autorise) {
    redirect("/inscription?erreur=trop-de-tentatives");
  }

  if (!["client", "proprietaire"].includes(role)) {
    redirect("/inscription?erreur=role-invalide");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Ces données arrivent dans raw_user_meta_data, lues par le
      // trigger handle_new_user() pour créer automatiquement le profil.
      data: { role, nom, prenom, telephone },
    },
  });

  if (error) {
    // Message générique côté utilisateur — ne jamais renvoyer le
    // détail technique brut (règle : pas de données internes dans
    // les messages d'erreur exposés au client).
    console.error("Erreur inscription Supabase:", error.message);
    redirect("/inscription?erreur=creation-impossible");
  }

  // Si le compte créé est un propriétaire, on complète sa fiche pro
  // dans une étape séparée (formulaire pro), pas ici.
  if (role === "proprietaire") {
    redirect("/inscription/infos-professionnelles");
  }

  redirect("/connexion?message=verifiez-votre-email");
}

export async function seConnecter(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectVers = formData.get("redirect") as string | null;

  // Limite anti-brute-force basique : 10 tentatives / 15 min par email.
  const debit = limiterDebit(`connexion:${email}`, 10, 15 * 60 * 1000);
  if (!debit.autorise) {
    redirect("/connexion?erreur=trop-de-tentatives");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      redirect("/connexion?erreur=email-non-confirme");
    }
    redirect("/connexion?erreur=identifiants-invalides");
  }

  // Redirection selon le rôle : le propriétaire va vers son espace de
  // gestion, le client reste sur la page d'accueil (son profil est
  // accessible depuis le menu du header, pas un dashboard séparé) —
  // sauf s'il venait d'un parcours précis (ex: réservation en cours).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  if (profile?.role === "proprietaire") {
    redirect("/proprietaire/dashboard");
  }

  if (profile?.role === "admin" || profile?.role === "support") {
    redirect("/admin/dashboard");
  }

  if (profile?.role === "client" && redirectVers?.startsWith("/")) {
    redirect(redirectVers);
  }

  redirect("/");
}

export async function demanderReinitialisationMotDePasse(formData: FormData) {
  const email = formData.get("email") as string;

  // Limite basique : 3 demandes / heure par email, pour éviter le
  // spam de boîtes mail via ce formulaire.
  const debit = limiterDebit(`reset:${email}`, 3, 60 * 60 * 1000);
  if (!debit.autorise) {
    redirect("/mot-de-passe-oublie?message=envoye"); // réponse identique, ne révèle rien
  }

  const supabase = await createClient();

  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${site}/reinitialiser-mot-de-passe`,
  });

  // On répond toujours pareil (email envoyé) que le compte existe ou
  // non, pour ne pas révéler quels emails sont inscrits.
  redirect("/mot-de-passe-oublie?message=envoye");
}

export async function seDeconnecter() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
