"use client";

import type { KeyboardEvent } from "react";
import type { VoicePreset } from "@/lib/voices";
import { PlayIcon, StopIcon } from "./icons";

export type Assignment =
  | { kind: "demo" }
  | { kind: "loading" }
  | { kind: "assigned"; voiceName: string; overridden: boolean }
  | { kind: "unavailable" };

interface Props {
  preset: VoicePreset;
  selected: boolean;
  assignment: Assignment;
  previewing: boolean;
  previewLoading: boolean;
  onSelect: () => void;
  onPreview: () => void;
}

function assignmentText(a: Assignment): string {
  switch (a.kind) {
    case "demo":
      return "Voice assigned once an API key is configured";
    case "loading":
      return "Finding a matching voice…";
    case "assigned":
      return `Voice: ${a.voiceName}${a.overridden ? " (your choice)" : ""}`;
    case "unavailable":
      return "No matching voice on this account. Pick one in Voice settings.";
  }
}

export default function VoiceCard({ preset, selected, assignment, previewing, previewLoading, onSelect, onPreview }: Props) {
  const canPreview = assignment.kind === "demo" || assignment.kind === "assigned";

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onSelect();
    }
  }

  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={onKey}
      className={`group relative flex cursor-pointer flex-col gap-2 rounded-xl border p-3.5 text-left transition duration-300 ${
        selected ? "border-accent bg-elevated shadow-glow" : "border-line bg-surface hover:border-accent/60 hover:bg-elevated/60"
      } ${assignment.kind === "unavailable" ? "opacity-85" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold leading-tight">{preset.name}</h3>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <span className="badge capitalize">{preset.gender}</span>
            <span className="badge badge-accent">Pitch: {preset.pitch}</span>
          </div>
        </div>
        <span
          aria-hidden="true"
          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition ${
            selected ? "border-accent" : "border-line"
          }`}
        >
          {selected && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
        </span>
      </div>

      <p className="text-sm">{preset.tone}</p>
      <p className="text-xs text-muted">
        <span className="font-medium text-ink">Best for:</span> {preset.bestFor}
      </p>
      <p className={`text-xs ${assignment.kind === "unavailable" ? "text-danger" : "text-muted"}`}>{assignmentText(assignment)}</p>

      <button
        type="button"
        disabled={!canPreview || previewLoading}
        onClick={(e) => {
          e.stopPropagation();
          onPreview();
        }}
        aria-label={`${previewing ? "Stop" : "Preview"} ${preset.gender} ${preset.name}`}
        className="btn btn-ghost mt-1 !py-1.5 text-xs"
      >
        {previewLoading ? (
          "Loading…"
        ) : previewing ? (
          <>
            <StopIcon width={14} height={14} /> Stop
          </>
        ) : (
          <>
            <PlayIcon width={14} height={14} /> Preview
          </>
        )}
      </button>
    </div>
  );
}
