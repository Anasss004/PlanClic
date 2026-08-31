"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { CheckCircle2, XCircle, Info, X, Undo2 } from "lucide-react";

type ToastType = "success" | "error" | "info";
type ToastAction = { label: string; onClick: () => void };
type Toast = {
  id: number;
  type: ToastType;
  message: string;
  action?: ToastAction;
  expiresAt?: number; // pour la barre de compte à rebours (undo)
  durationMs: number;
};

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  /** Toast avec un bouton d'action personnalisé. Renvoie l'id du toast. */
  action: (
    message: string,
    action: ToastAction,
    opts?: { type?: ToastType; durationMs?: number }
  ) => number;
  dismiss: (id: number) => void;
  /**
   * Action à risque avec délai de grâce : affiche un toast "Annuler"
   * pendant `seconds` secondes. Passé ce délai sans annulation,
   * `commit()` est exécuté. Si l'utilisateur annule, rien n'est fait.
   */
  undoable: (
    message: string,
    commit: () => void | Promise<void>,
    opts?: { seconds?: number; onCancel?: () => void }
  ) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast doit être utilisé dans <ToastProvider>");
  return ctx;
}

let compteur = 0;

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const retirer = useCallback((id: number) => {
    setToasts((t) => t.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const pousser = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = ++compteur;
      setToasts((t) => [...t, { ...toast, id }]);
      timers.current.set(
        id,
        setTimeout(() => retirer(id), toast.durationMs)
      );
      return id;
    },
    [retirer]
  );

  const api: ToastApi = {
    success: (message) => void pousser({ type: "success", message, durationMs: 4000 }),
    error: (message) => void pousser({ type: "error", message, durationMs: 4000 }),
    info: (message) => void pousser({ type: "info", message, durationMs: 4000 }),
    action: (message, action, opts) =>
      pousser({
        type: opts?.type ?? "info",
        message,
        action,
        durationMs: opts?.durationMs ?? 6000,
      }),
    dismiss: retirer,
    undoable: (message, commit, opts) => {
      const seconds = opts?.seconds ?? 5;
      const durationMs = seconds * 1000;
      let annule = false;
      const id = pousser({
        type: "info",
        message,
        durationMs,
        expiresAt: Date.now() + durationMs,
        action: {
          label: "Annuler",
          onClick: () => {
            annule = true;
            retirer(id);
            opts?.onCancel?.();
          },
        },
      });
      // Le timer de `pousser` retire le toast ; on lance le commit en parallèle
      // au même délai, sauf annulation.
      window.setTimeout(() => {
        if (!annule) Promise.resolve(commit()).catch(() => {});
      }, durationMs);
    },
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => retirer(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [restant, setRestant] = useState(100);

  useEffect(() => {
    if (!toast.expiresAt) return;
    const total = toast.durationMs;
    const tick = () => {
      const reste = Math.max(0, (toast.expiresAt! - Date.now()) / total) * 100;
      setRestant(reste);
    };
    tick();
    const interval = setInterval(tick, 80);
    return () => clearInterval(interval);
  }, [toast.expiresAt, toast.durationMs]);

  const styles: Record<ToastType, string> = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-rose-200 bg-rose-50 text-rose-800",
    info: "border-dash-border bg-white text-dash-text",
  };
  const Icone =
    toast.type === "success" ? CheckCircle2 : toast.type === "error" ? XCircle : Info;

  return (
    <div
      role="alert"
      className={`relative w-80 max-w-[90vw] overflow-hidden rounded-xl border px-4 py-3 shadow-lg transition-all ${styles[toast.type]}`}
    >
      <div className="flex items-start gap-2.5">
        <Icone size={18} strokeWidth={1.75} className="mt-0.5 shrink-0" />
        <p className="flex-1 text-sm">{toast.message}</p>
        {toast.action ? (
          <button
            onClick={toast.action.onClick}
            className="shrink-0 flex items-center gap-1 rounded-md bg-black/5 px-2 py-1 text-xs font-semibold hover:bg-black/10"
          >
            <Undo2 size={12} strokeWidth={2.5} />
            {toast.action.label}
          </button>
        ) : (
          <button
            onClick={onClose}
            className="shrink-0 opacity-60 hover:opacity-100"
            aria-label="Fermer"
          >
            <X size={14} strokeWidth={2} />
          </button>
        )}
      </div>
      {toast.expiresAt && (
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-black/10">
          <div
            className="h-full bg-black/30 transition-[width] duration-75 ease-linear"
            style={{ width: `${restant}%` }}
          />
        </div>
      )}
    </div>
  );
}
