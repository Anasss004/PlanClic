"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";

type Toast = { id: number; type: "success" | "error"; message: string };

const ToastContext = createContext<{
  success: (message: string) => void;
  error: (message: string) => void;
} | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast doit être utilisé dans <ToastProvider>");
  return ctx;
}

let compteur = 0;

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const retirer = useCallback((id: number) => {
    setToasts((t) => t.filter((toast) => toast.id !== id));
  }, []);

  const ajouter = useCallback(
    (type: "success" | "error", message: string) => {
      const id = ++compteur;
      setToasts((t) => [...t, { id, type, message }]);
      setTimeout(() => retirer(id), 4000);
    },
    [retirer]
  );

  const value = {
    success: (message: string) => ajouter("success", message),
    error: (message: string) => ajouter("error", message),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={`flex w-80 max-w-[90vw] items-start gap-2.5 rounded-xl border px-4 py-3 shadow-lg transition-all animate-in slide-in-from-bottom-2 ${
              t.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {t.type === "success" ? (
              <CheckCircle2 size={18} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            ) : (
              <XCircle size={18} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            )}
            <p className="flex-1 text-sm">{t.message}</p>
            <button
              onClick={() => retirer(t.id)}
              className="shrink-0 opacity-60 hover:opacity-100"
              aria-label="Fermer"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
