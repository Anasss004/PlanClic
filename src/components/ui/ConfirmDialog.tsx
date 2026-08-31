"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { AlertTriangle, X } from "lucide-react";

type OptionsConfirmation = {
  titre: string;
  message?: string;
  labelConfirmer?: string;
  labelAnnuler?: string;
  danger?: boolean;
};

type ConfirmApi = (options: OptionsConfirmation) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmApi | null>(null);

export function useConfirm(): ConfirmApi {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm doit être utilisé dans <ConfirmProvider>");
  return ctx;
}

export default function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<OptionsConfirmation | null>(null);
  const resolveRef = useRef<((valeur: boolean) => void) | null>(null);

  const confirmer = useCallback<ConfirmApi>((opts) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const repondre = useCallback((valeur: boolean) => {
    resolveRef.current?.(valeur);
    resolveRef.current = null;
    setOptions(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirmer}>
      {children}
      {options && (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center bg-black/40 p-4 font-[family-name:var(--font-jakarta)]"
          onClick={() => repondre(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {options.danger && (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100">
                    <AlertTriangle size={18} strokeWidth={2} className="text-rose-600" />
                  </span>
                )}
                <h2 className="text-lg font-semibold text-dash-dark">{options.titre}</h2>
              </div>
              <button
                onClick={() => repondre(false)}
                className="shrink-0 text-gray-400 hover:text-gray-600"
                aria-label="Fermer"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            {options.message && (
              <p className="mb-5 text-sm text-dash-text-secondary">{options.message}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => repondre(false)}
                className="rounded-lg border border-dash-border px-4 py-2 text-sm font-medium text-dash-text-secondary transition hover:bg-gray-50"
              >
                {options.labelAnnuler ?? "Annuler"}
              </button>
              <button
                onClick={() => repondre(true)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
                  options.danger
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-dash-sidebar hover:opacity-90"
                }`}
              >
                {options.labelConfirmer ?? "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
