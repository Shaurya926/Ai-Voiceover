"use client";

import type { ReactNode, RefObject } from "react";

interface Props {
  text: string;
  onChange: (v: string) => void;
  maxChars: number;
  modelLabel: string;
  disabled: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onClear: () => void;
  onSample: () => void;
  footer: ReactNode;
}

export default function ScriptEditor({ text, onChange, maxChars, modelLabel, disabled, textareaRef, onClear, onSample, footer }: Props) {
  const len = text.length;
  const over = len > maxChars;
  const pct = Math.min(100, (len / maxChars) * 100);

  return (
    <section className="card p-4 sm:p-5" aria-labelledby="script-title">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="script-title" className="card-title">
          Script
        </h2>
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost !px-3 !py-1.5" onClick={onSample} disabled={disabled}>
            Sample script
          </button>
          <button type="button" className="btn btn-ghost !px-3 !py-1.5" onClick={onClear} disabled={disabled || len === 0}>
            Clear
          </button>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        spellCheck
        rows={10}
        aria-describedby="script-help"
        aria-invalid={over}
        placeholder="Type or paste the words you want spoken…"
        className={`field min-h-[14rem] resize-y bg-surface text-base leading-relaxed ${over ? "border-danger" : ""}`}
      />

      <div className="mt-2 flex items-center justify-between gap-3 text-xs">
        <p id="script-help" className="text-muted">
          {len === 0
            ? "Tip: short sentences and natural punctuation give the most natural pacing."
            : `Limit for ${modelLabel}: ${maxChars.toLocaleString()} characters per generation. Longer scripts need to be split.`}
        </p>
        <p className={`shrink-0 tabular-nums ${over ? "font-semibold text-danger" : "text-muted"}`} aria-live="polite">
          {len.toLocaleString()} / {maxChars.toLocaleString()}
        </p>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <div className={`h-full rounded-full transition-all ${over ? "bg-danger" : "bg-accent"}`} style={{ width: `${pct}%` }} />
      </div>

      {len === 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-line bg-bg/60 p-3 text-sm text-muted">
          <p className="font-medium text-ink">Start here</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5">
            <li>Write or paste a script, or press “Sample script”.</li>
            <li>Pick a voice style below and adjust the delivery settings.</li>
            <li>Generate, listen, then download the MP3.</li>
          </ol>
        </div>
      )}

      <div className="mt-4">{footer}</div>
    </section>
  );
}
