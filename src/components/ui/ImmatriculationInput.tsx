"use client";

import { useState, useEffect } from "react";

// Format matricule marocain : Numéro (jusqu'à 5 chiffres) - Lettre - Code région (1-2 chiffres)
// Affiché comme sur la plaque physique : 12345 | أ | 6
// Stocké en base sous la forme "12345-أ-6" (name="immatriculation").
export default function ImmatriculationInput({
  name = "immatriculation",
  required = true,
}: {
  name?: string;
  required?: boolean;
}) {
  const [numero, setNumero] = useState("");
  const [lettre, setLettre] = useState("");
  const [region, setRegion] = useState("");
  const [valeur, setValeur] = useState("");

  useEffect(() => {
    setValeur(numero && lettre && region ? `${numero}-${lettre}-${region}` : "");
  }, [numero, lettre, region]);

  return (
    <div>
      <div className="flex items-stretch overflow-hidden rounded-full border border-gray-200 bg-white focus-within:border-brand-dark">
        <input
          type="text"
          inputMode="numeric"
          maxLength={5}
          placeholder="12345"
          value={numero}
          onChange={(e) => setNumero(e.target.value.replace(/\D/g, ""))}
          required={required}
          className="w-20 border-r border-gray-200 px-3 py-2.5 text-center text-sm text-gray-900 outline-none"
        />
        <input
          type="text"
          maxLength={1}
          placeholder="أ"
          value={lettre}
          onChange={(e) => setLettre(e.target.value.slice(0, 1))}
          required={required}
          className="w-14 border-r border-gray-200 px-2 py-2.5 text-center text-sm text-gray-900 outline-none"
        />
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          placeholder="6"
          value={region}
          onChange={(e) => setRegion(e.target.value.replace(/\D/g, ""))}
          required={required}
          className="w-14 px-3 py-2.5 text-center text-sm text-gray-900 outline-none"
        />
      </div>
      <input type="hidden" name={name} value={valeur} />
    </div>
  );
}
