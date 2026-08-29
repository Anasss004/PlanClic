"use client";

import { useRef, useState } from "react";
import { Upload, FileText, ImageIcon, X } from "lucide-react";

const THEMES = {
  brand: {
    border: "border-[#b9b9b9]",
    borderActif: "border-brand-dark bg-brand-light/20",
    texte: "text-brand-dark",
    bouton: "bg-brand-accent text-brand-dark",
  },
  dash: {
    border: "border-dash-border",
    borderActif: "border-dash-dark bg-dash-accent/10",
    texte: "text-dash-dark",
    bouton: "bg-dash-accent text-dash-text",
  },
} as const;

export default function FileUpload({
  name,
  accept = "image/*",
  multiple = false,
  required = false,
  hint,
  theme = "brand",
}: {
  name: string;
  accept?: string;
  multiple?: boolean;
  required?: boolean;
  hint?: string;
  theme?: keyof typeof THEMES;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [survole, setSurvole] = useState(false);
  const c = THEMES[theme];

  function appliquerFichiers(liste: FileList | null) {
    if (!liste || liste.length === 0) return;
    const nouveaux = multiple ? [...fichiers, ...Array.from(liste)] : [liste[0]];
    setFichiers(nouveaux);
    synchroniserInput(nouveaux);
  }

  function synchroniserInput(liste: File[]) {
    if (!inputRef.current) return;
    const dt = new DataTransfer();
    liste.forEach((f) => dt.items.add(f));
    inputRef.current.files = dt.files;
  }

  function retirer(index: number) {
    const nouveaux = fichiers.filter((_, i) => i !== index);
    setFichiers(nouveaux);
    synchroniserInput(nouveaux);
  }

  function formatTaille(octets: number) {
    if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
    return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        multiple={multiple}
        required={required && fichiers.length === 0}
        onChange={(e) => appliquerFichiers(e.target.files)}
        className="hidden"
      />

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setSurvole(true);
        }}
        onDragLeave={() => setSurvole(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSurvole(false);
          appliquerFichiers(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
          survole ? c.borderActif : c.border
        }`}
      >
        <Upload size={22} strokeWidth={1.5} className={`${c.texte} opacity-60`} />
        <p className="text-sm">
          <span className={`inline-block rounded-full px-4 py-1.5 text-xs font-semibold ${c.bouton}`}>
            Importer {multiple ? "des fichiers" : "un fichier"}
          </span>
        </p>
        <p className="text-xs text-gray-400">ou glisse-dépose ici</p>
        {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
      </div>

      {fichiers.length > 0 && (
        <ul className="mt-3 space-y-2">
          {fichiers.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs"
            >
              {f.type.startsWith("image/") ? (
                <ImageIcon size={14} strokeWidth={1.75} className="shrink-0 text-gray-400" />
              ) : (
                <FileText size={14} strokeWidth={1.75} className="shrink-0 text-gray-400" />
              )}
              <span className="min-w-0 flex-1 truncate text-gray-700">{f.name}</span>
              <span className="shrink-0 text-gray-400">{formatTaille(f.size)}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  retirer(i);
                }}
                className="shrink-0 rounded-full p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                aria-label="Retirer"
              >
                <X size={13} strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
