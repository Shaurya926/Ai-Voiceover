import type { ReactNode } from "react";

type Kind = "error" | "success" | "info";

const styles: Record<Kind, string> = {
  error: "border-danger/50 bg-danger/10",
  success: "border-ok/50 bg-ok/10",
  info: "border-accent/50 bg-accent/10",
};

export default function Alert({ kind, children, onDismiss }: { kind: Kind; children: ReactNode; onDismiss?: () => void }) {
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={`flex items-start justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-sm animate-fadein ${styles[kind]}`}
    >
      <div className="min-w-0">{children}</div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss message" className="shrink-0 text-muted hover:text-ink">
          ✕
        </button>
      )}
    </div>
  );
}
