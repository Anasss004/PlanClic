import { modifierProfil } from "@/app/actions/client";

export default function InfosPersonnelles({ profile }: { profile: any }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">
        Informations personnelles
      </h2>

      <form action={modifierProfil} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Prénom
            </label>
            <input
              name="prenom"
              defaultValue={profile.prenom}
              required
              className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-brand-dark"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Nom
            </label>
            <input
              name="nom"
              defaultValue={profile.nom}
              required
              className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-brand-dark"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Genre
            </label>
            <select
              name="genre"
              defaultValue={profile.genre ?? ""}
              className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-brand-dark"
            >
              <option value="">Non précisé</option>
              <option value="homme">Homme</option>
              <option value="femme">Femme</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Date de naissance
            </label>
            <input
              type="date"
              name="date_naissance"
              defaultValue={profile.date_naissance ?? ""}
              className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-brand-dark"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Téléphone
          </label>
          <input
            name="telephone"
            defaultValue={profile.telephone ?? ""}
            className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-brand-dark"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Email
          </label>
          <input
            value={profile.email}
            disabled
            className="w-full rounded-full border border-gray-100 bg-gray-50 px-4 py-2.5 text-sm text-gray-400"
          />
          <p className="mt-1 text-xs text-gray-400">
            L&apos;email ne peut pas être modifié ici.
          </p>
        </div>

        <button
          type="submit"
          className="rounded-full bg-brand-accent px-6 py-2.5 text-sm font-semibold text-brand-dark shadow transition hover:brightness-95"
        >
          Enregistrer
        </button>
      </form>
    </div>
  );
}
