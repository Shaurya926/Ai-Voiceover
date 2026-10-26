"use client";

import type { Ref } from "react";
import { MODELS } from "@/lib/config";
import type { GenResult } from "@/lib/types";
import AudioPlayer, { Waveform } from "./AudioPlayer";
import { PlayIcon, StopIcon } from "./icons";

interface Props {
  sectionRef: Ref<HTMLElement>;
  busy: boolean;
  demo: boolean;
  result: GenResult | null;
  demoPlaying: boolean;
  onDemoToggle: () => void;
  canDemo: boolean;
}

export default function OutputPanel({ sectionRef, busy, demo, result, demoPlaying, onDemoToggle, canDemo }: Props) {
  return (
    <section ref={sectionRef} className="card p-4 sm:p-5" aria-labelledby="output-title" aria-live="polite">
      <h2 id="output-title" className="card-title mb-3">
        Recording
      </h2>

      {busy && (
        <div className="space-y-3 animate-fadein">
          <Waveform active />
          <p className="text-sm text-muted">Generating speech with ElevenLabs… this usually takes a few seconds.</p>
        </div>
      )}

      {!busy && result && (
        <div className="space-y-4 animate-fadein">
          <AudioPlayer src={result.url} filename={result.filename} />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <dt className="text-muted">Style</dt>
            <dd>{result.presetName}</dd>
            <dt className="text-muted">Voice</dt>
            <dd>{result.voiceName}</dd>
            <dt className="text-muted">Model</dt>
            <dd>{MODELS[result.model].label}</dd>
            <dt className="text-muted">Characters</dt>
            <dd>{result.chars.toLocaleString()}</dd>
          </dl>
          {result.notes.length > 0 && (
            <div className="rounded-xl border border-line bg-bg/60 p-3">
              <p className="text-xs font-semibold">What was actually applied</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-muted">
                {result.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-muted">The recording lives only in this tab. Download it before closing or generating again.</p>
        </div>
      )}

      {!busy && !result && demo && (
        <div className="space-y-3">
          <Waveform active={demoPlaying} />
          <p className="text-sm">
            <span className="font-semibold">Demo Mode:</span> real AI speech generation needs an ElevenLabs API key. You can still hear a rough
            stand-in using your browser’s built-in voice.
          </p>
          <button type="button" className="btn btn-ghost" onClick={onDemoToggle} disabled={!canDemo}>
            {demoPlaying ? (
              <>
                <StopIcon width={14} height={14} /> Stop demo playback
              </>
            ) : (
              <>
                <PlayIcon width={14} height={14} /> Play browser demo voice
              </>
            )}
          </button>
          <p className="text-xs text-muted">Not AI-generated, not downloadable, and shortened to the first ~400 characters.</p>
        </div>
      )}

      {!busy && !result && !demo && (
        <div className="space-y-3">
          <Waveform />
          <p className="text-sm text-muted">Your generated recording will appear here with play, pause, replay and download controls.</p>
        </div>
      )}
    </section>
  );
}
