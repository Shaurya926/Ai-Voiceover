"use client";

import type { ReactNode } from "react";
import { DELIVERIES, EMOTIONS, MODELS, SPEED_MAX, SPEED_MIN } from "@/lib/config";
import type { DeliverySettings, ModelId } from "@/lib/config";
import type { VoiceOption } from "@/lib/types";
import type { VoicePreset } from "@/lib/voices";
import { LockIcon } from "./icons";

function Row({ label, value, reason, htmlFor, children }: { label: string; value?: string; reason?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </label>
        {reason ? (
          <span className="badge text-muted">
            <LockIcon className="mr-1" /> Not available
          </span>
        ) : (
          value && <span className="text-xs tabular-nums text-muted">{value}</span>
        )}
      </div>
      {children}
      {reason && <p className="text-xs text-muted">{reason}</p>}
    </div>
  );
}

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface Props {
  preset: VoicePreset;
  demo: boolean;
  model: ModelId;
  onModel: (m: ModelId) => void;
  settings: DeliverySettings;
  onSettings: (patch: Partial<DeliverySettings>) => void;
  onReset: () => void;
  assignedName: string | null;
  overrideId: string;
  onOverride: (id: string) => void;
  voices: VoiceOption[];
  onInsertPause: (seconds: number) => void;
}

export default function ControlsPanel(p: Props) {
  const info = MODELS[p.model];
  const s = p.settings;

  return (
    <section className="card space-y-6 p-4 sm:p-5" aria-labelledby="controls-title">
      <h2 id="controls-title" className="card-title">
        Voice settings
      </h2>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Voice identity</legend>
        <Row
          label="Underlying voice"
          htmlFor="voice-select"
          reason={p.demo ? "Demo Mode has no provider voices. Configure ELEVENLABS_API_KEY to choose from your account’s voices." : undefined}
        >
          <select
            id="voice-select"
            className="field"
            disabled={p.demo || p.voices.length === 0}
            value={p.overrideId}
            onChange={(e) => p.onOverride(e.target.value)}
          >
            <option value="">{p.assignedName ? `Preset default (${p.assignedName})` : "Preset default (none available)"}</option>
            {p.voices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
                {v.gender ? ` · ${v.gender}` : ""}
              </option>
            ))}
          </select>
        </Row>
        <p className="text-xs text-muted">Changing the voice never changes your delivery settings below, and vice versa.</p>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Model</legend>
        <Row label="Speech model" htmlFor="model-select">
          <select id="model-select" className="field" value={p.model} onChange={(e) => p.onModel(e.target.value as ModelId)}>
            {Object.values(MODELS).map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </Row>
        <p className="text-xs text-muted">{info.blurb}</p>
      </fieldset>

      <fieldset className="space-y-4">
        <div className="flex items-center justify-between">
          <legend className="text-xs font-semibold uppercase tracking-wider text-muted">Delivery</legend>
          <button type="button" className="text-xs underline underline-offset-2 hover:text-accent" onClick={p.onReset}>
            Reset to “{p.preset.name}” defaults
          </button>
        </div>

        <Row
          label="Speaking speed"
          htmlFor="speed"
          value={`${s.speed.toFixed(2)}×`}
          reason={info.supportsSpeed ? undefined : "Eleven v3 has no speed parameter. Switch to Multilingual v2 to change pace."}
        >
          <input
            id="speed"
            type="range"
            min={SPEED_MIN}
            max={SPEED_MAX}
            step={0.05}
            value={s.speed}
            disabled={!info.supportsSpeed}
            onChange={(e) => p.onSettings({ speed: Number(e.target.value) })}
          />
          <div className="flex justify-between text-[11px] text-muted">
            <span>Slow</span>
            <span>Fast</span>
          </div>
        </Row>

        <Row
          label="Vocal intensity"
          htmlFor="intensity"
          value={`${s.intensity}%`}
        >
          <input
            id="intensity"
            type="range"
            min={0}
            max={100}
            step={5}
            value={s.intensity}
            onChange={(e) => p.onSettings({ intensity: Number(e.target.value) })}
          />
          <div className="flex justify-between text-[11px] text-muted">
            <span>Soft</span>
            <span>Strong</span>
          </div>
          <p className="text-xs text-muted">
            {info.supportsStyle
              ? "Applied as lower stability plus higher style exaggeration. More expressive, slightly less consistent."
              : "On Eleven v3 this maps to one of three stability levels (robust, natural, creative)."}
          </p>
        </Row>

        <Row
          label="Pitch"
          htmlFor="pitch"
          reason="ElevenLabs text-to-speech has no pitch control. Pitch comes from the voice you choose, so pick a lower or higher voice style instead."
        >
          <input id="pitch" type="range" min={0} max={100} defaultValue={50} disabled aria-disabled="true" />
        </Row>

        <Row
          label="Emotional delivery"
          htmlFor="emotion"
          reason={info.supportsAudioTags ? undefined : "Only Eleven v3 can be steered with emotion tags. Switch the model to use this."}
        >
          <select
            id="emotion"
            className="field"
            disabled={!info.supportsAudioTags}
            value={s.emotion}
            onChange={(e) => p.onSettings({ emotion: e.target.value as DeliverySettings["emotion"] })}
          >
            {EMOTIONS.map((e) => (
              <option key={e} value={e}>
                {titleCase(e)}
              </option>
            ))}
          </select>
        </Row>

        <Row
          label="Delivery style"
          htmlFor="delivery"
          reason={info.supportsAudioTags ? undefined : "Only Eleven v3 can be steered with delivery tags. Switch the model to use this."}
        >
          <select
            id="delivery"
            className="field"
            disabled={!info.supportsAudioTags}
            value={s.delivery}
            onChange={(e) => p.onSettings({ delivery: e.target.value as DeliverySettings["delivery"] })}
          >
            {DELIVERIES.map((d) => (
              <option key={d} value={d}>
                {titleCase(d)}
              </option>
            ))}
          </select>
        </Row>
        {info.supportsAudioTags && (
          <p className="text-xs text-muted">Emotion and delivery are sent to Eleven v3 as inline tags. The model interprets them, so results vary.</p>
        )}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Pauses and emphasis</legend>
        <Row
          label="Insert a pause at the cursor"
          reason={info.supportsBreakTags ? undefined : "Eleven v3 doesn’t support pause tags. Use commas, ellipses or line breaks for natural pauses."}
        >
          <div className="flex flex-wrap gap-2">
            {[0.5, 1, 2].map((sec) => (
              <button key={sec} type="button" className="btn btn-ghost !px-3 !py-1.5" disabled={!info.supportsBreakTags} onClick={() => p.onInsertPause(sec)}>
                {sec}s
              </button>
            ))}
          </div>
        </Row>
        <p className="text-xs text-muted">
          Emphasis has no dedicated control in the API. Punctuation, short sentences and italics-free phrasing are the reliable tools.
        </p>
      </fieldset>
    </section>
  );
}
