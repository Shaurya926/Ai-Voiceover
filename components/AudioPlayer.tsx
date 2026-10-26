"use client";

import { useEffect, useRef, useState } from "react";
import { DownloadIcon, PauseIcon, PlayIcon, ReplayIcon } from "./icons";

const BARS = 48;
const HEIGHTS = Array.from({ length: BARS }, (_, i) => 0.22 + 0.78 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.45)));

function fmt(t: number) {
  if (!Number.isFinite(t) || t < 0) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function Waveform({ progress = 0, active = false }: { progress?: number; active?: boolean }) {
  return (
    <div className="flex h-16 items-center gap-[3px]" aria-hidden="true">
      {HEIGHTS.map((h, i) => (
        <span
          key={i}
          className={`block flex-1 rounded-full ${active ? "animate-wave" : ""} ${i / BARS < progress ? "bg-accent" : "bg-accent/30"}`}
          style={{ height: `${h * 100}%`, animationDelay: `${(i % 12) * 0.09}s` }}
        />
      ))}
    </div>
  );
}

export default function AudioPlayer({ src, filename }: { src: string; filename: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    setPlaying(false);
    setTime(0);
    setDur(0);
  }, [src]);

  function toggle() {
    const a = ref.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => setPlaying(false));
    else a.pause();
  }

  function replay() {
    const a = ref.current;
    if (!a) return;
    a.currentTime = 0;
    a.play().catch(() => setPlaying(false));
  }

  function seek(v: number) {
    const a = ref.current;
    if (!a) return;
    a.currentTime = v;
    setTime(v);
  }

  return (
    <div className="space-y-3">
      <audio
        ref={ref}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDur(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
      />
      <Waveform progress={dur ? time / dur : 0} active={playing} />
      <input
        type="range"
        min={0}
        max={dur || 1}
        step={0.01}
        value={Math.min(time, dur || 1)}
        onChange={(e) => seek(Number(e.target.value))}
        aria-label="Seek"
        disabled={!dur}
      />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button type="button" onClick={toggle} className="btn btn-primary h-11 w-11 !rounded-full !p-0" aria-label={playing ? "Pause" : "Play"}>
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button type="button" onClick={replay} className="btn btn-ghost h-11 w-11 !rounded-full !p-0" aria-label="Replay from start">
            <ReplayIcon />
          </button>
          <span className="ml-1 text-xs tabular-nums text-muted">
            {fmt(time)} / {fmt(dur)}
          </span>
        </div>
        <a href={src} download={filename} className="btn btn-ghost">
          <DownloadIcon /> Download MP3
        </a>
      </div>
    </div>
  );
}
