"use client";

import { MODELS } from "@/lib/config";
import type { HistoryItem } from "@/lib/types";
import { TrashIcon } from "./icons";

interface Props {
  items: HistoryItem[];
  onReuse: (item: HistoryItem) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export default function HistoryPanel({ items, onReuse, onRemove, onClear }: Props) {
  return (
    <section className="card p-4 sm:p-5" aria-labelledby="history-title">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="history-title" className="card-title">
          Recent generations
        </h2>
        {items.length > 0 && (
          <button type="button" onClick={onClear} className="text-xs underline underline-offset-2 hover:text-accent">
            Clear all
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted">Nothing yet. Generated recordings will be listed here.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((h) => (
            <li key={h.id} className="rounded-xl border border-line bg-bg/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{h.snippet}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {h.presetName} ({h.gender}) · {h.voiceName} · {MODELS[h.model]?.label ?? h.model} · {h.chars.toLocaleString()} chars ·{" "}
                    {new Date(h.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" className="btn btn-ghost !px-2.5 !py-1 text-xs" onClick={() => onReuse(h)}>
                    Reuse
                  </button>
                  <button type="button" className="btn btn-ghost !px-2 !py-1" onClick={() => onRemove(h.id)} aria-label="Remove from history">
                    <TrashIcon width={15} height={15} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs text-muted">
        History is saved only in this browser. It isn’t synced between devices and disappears if you clear site data. Audio files are not stored, so
        generate again to re-download.
      </p>
    </section>
  );
}
