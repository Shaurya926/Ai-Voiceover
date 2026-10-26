"use client";

import type { Gender } from "@/lib/config";
import { FEMALE_PRESETS, MALE_PRESETS } from "@/lib/voices";
import type { VoicePreset } from "@/lib/voices";
import Alert from "./Alert";
import VoiceCard from "./VoiceCard";
import type { Assignment } from "./VoiceCard";

interface Props {
  gender: Gender;
  onGender: (g: Gender) => void;
  presetId: string;
  onSelect: (p: VoicePreset) => void;
  assignmentFor: (p: VoicePreset) => Assignment;
  previewingId: string | null;
  previewLoadingId: string | null;
  onPreview: (p: VoicePreset) => void;
  demo: boolean;
  voicesError: string | null;
}

export default function VoiceLibrary(props: Props) {
  const { gender, onGender, presetId, onSelect, assignmentFor, previewingId, previewLoadingId, onPreview, demo, voicesError } = props;
  const list = gender === "male" ? MALE_PRESETS : FEMALE_PRESETS;

  return (
    <section className="card p-4 sm:p-5" aria-labelledby="voices-title">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="voices-title" className="card-title">
          Voice style
        </h2>
        <div role="tablist" aria-label="Voice category" className="inline-flex rounded-xl border border-line bg-bg p-1">
          {(["male", "female"] as const).map((g) => (
            <button
              key={g}
              role="tab"
              type="button"
              aria-selected={gender === g}
              onClick={() => onGender(g)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition ${
                gender === g ? "bg-accent text-onaccent" : "text-muted hover:text-ink"
              }`}
            >
              {g} (10)
            </button>
          ))}
        </div>
      </div>

      <p className="mb-3 text-sm text-muted">
        Styles are presets, not 20 separate people: each one maps to a voice that actually exists on your ElevenLabs account, and you can swap
        the underlying voice in Voice settings.
      </p>

      {demo && (
        <div className="mb-3">
          <Alert kind="info">Previews in Demo Mode use your browser’s built-in voice. They only hint at pitch and pace and are not AI speech.</Alert>
        </div>
      )}
      {voicesError && (
        <div className="mb-3">
          <Alert kind="error">{voicesError}</Alert>
        </div>
      )}

      <div role="radiogroup" aria-label={`${gender} voice styles`} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((p) => (
          <VoiceCard
            key={p.id}
            preset={p}
            selected={p.id === presetId}
            assignment={assignmentFor(p)}
            previewing={previewingId === p.id}
            previewLoading={previewLoadingId === p.id}
            onSelect={() => onSelect(p)}
            onPreview={() => onPreview(p)}
          />
        ))}
      </div>
    </section>
  );
}
