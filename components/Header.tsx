import ThemeToggle from "./ThemeToggle";
import { LogoMark } from "./icons";

export type Mode = "checking" | "demo" | "live";

export default function Header({ mode }: { mode: Mode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <LogoMark />
          <div className="leading-tight">
            <h1 className="text-base font-semibold tracking-tight">AuraVoice Studio</h1>
            <p className="hidden text-xs text-muted sm:block">AI voice-over from your script</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {mode === "demo" && (
            <span className="badge badge-accent" role="status">
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-accent" />
              Demo Mode
            </span>
          )}
          {mode === "live" && (
            <span className="badge" role="status">
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-ok" />
              Live · ElevenLabs
            </span>
          )}
          {mode === "checking" && <span className="badge text-muted">Checking…</span>}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
