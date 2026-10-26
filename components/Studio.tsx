"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_MODEL, MODELS, SAMPLE_SCRIPT, isModelId } from "@/lib/config";
import type { DeliverySettings, Gender, ModelId } from "@/lib/config";
import { demoSupported, speakDemo, stopDemo } from "@/lib/demo";
import { KEYS, readJSON, writeJSON } from "@/lib/storage";
import type { GenResult, HistoryItem, VoiceOption } from "@/lib/types";
import { validateScript } from "@/lib/validate";
import { PRESETS, getPreset } from "@/lib/voices";
import type { VoicePreset } from "@/lib/voices";
import Alert from "./Alert";
import ControlsPanel from "./ControlsPanel";
import Header from "./Header";
import HistoryPanel from "./HistoryPanel";
import OutputPanel from "./OutputPanel";
import ScriptEditor from "./ScriptEditor";
import { SparkIcon } from "./icons";
import VoiceLibrary from "./VoiceLibrary";
import type { Assignment } from "./VoiceCard";

interface Prefs {
  gender: Gender;
  presetId: string;
  overrides: Record<string, string>;
  model?: ModelId;
  settings: DeliverySettings;
  text: string;
}

interface Status {
  demo: boolean;
  defaultModel: ModelId;
}

interface VoicesInfo {
  voices: VoiceOption[];
  presets: Record<string, { id: string; name: string } | null>;
}

const MAX_HISTORY = 12;
const FIRST = PRESETS[0];

const DEFAULT_SETTINGS: DeliverySettings = {
  speed: FIRST.defaultSpeed,
  intensity: FIRST.defaultIntensity,
  emotion: "neutral",
  delivery: "conversational",
};

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function stamp(d: Date) {
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export default function Studio() {
  const [status, setStatus] = useState<Status | null>(null);
  const [voicesInfo, setVoicesInfo] = useState<VoicesInfo | null>(null);
  const [voicesError, setVoicesError] = useState<string | null>(null);

  const [gender, setGender] = useState<Gender>("male");
  const [presetId, setPresetId] = useState(FIRST.id);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL);
  const [settings, setSettings] = useState<DeliverySettings>(DEFAULT_SETTINGS);
  const [text, setText] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [result, setResult] = useState<GenResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [demoPlaying, setDemoPlaying] = useState(false);

  const [hydrated, setHydrated] = useState(false);
  const busyRef = useRef(false);
  const storedModel = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const outputRef = useRef<HTMLElement>(null);
  const previewAudio = useRef<HTMLAudioElement | null>(null);
  const previewCache = useRef(new Map<string, string>());
  const resultUrl = useRef<string | null>(null);

  const preset: VoicePreset = getPreset(presetId) ?? FIRST;
  const demo = status?.demo ?? false;
  const modelInfo = MODELS[model];
  const mode = status === null ? "checking" : demo ? "demo" : "live";

  /* ---------- load saved prefs + history (client only) ---------- */
  useEffect(() => {
    const prefs = readJSON<Partial<Prefs>>(KEYS.prefs, {});
    if (prefs.gender === "male" || prefs.gender === "female") setGender(prefs.gender);
    if (prefs.presetId && getPreset(prefs.presetId)) setPresetId(prefs.presetId);
    if (prefs.overrides && typeof prefs.overrides === "object") setOverrides(prefs.overrides);
    if (isModelId(prefs.model)) {
      setModel(prefs.model);
      storedModel.current = true;
    }
    if (prefs.settings) setSettings({ ...DEFAULT_SETTINGS, ...prefs.settings });
    if (typeof prefs.text === "string") setText(prefs.text);
    const h = readJSON<HistoryItem[]>(KEYS.history, []);
    if (Array.isArray(h)) setHistory(h.slice(0, MAX_HISTORY));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeJSON(KEYS.prefs, { gender, presetId, overrides, model, settings, text } satisfies Prefs);
  }, [hydrated, gender, presetId, overrides, model, settings, text]);

  useEffect(() => {
    if (hydrated) writeJSON(KEYS.history, history);
  }, [hydrated, history]);

  /* ---------- provider status + voices ---------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = (await (await fetch("/api/status")).json()) as Status;
        if (cancelled) return;
        setStatus(s);
        if (!storedModel.current) setModel(s.defaultModel);
        if (s.demo) return;
        const res = await fetch("/api/voices");
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setVoicesError(data?.error ?? "Could not load voices from ElevenLabs.");
          setVoicesInfo({ voices: [], presets: {} });
        } else {
          setVoicesInfo({ voices: data.voices, presets: data.presets });
        }
      } catch {
        if (!cancelled) {
          setStatus({ demo: true, defaultModel: DEFAULT_MODEL });
          setVoicesError(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- cleanup ---------- */
  useEffect(() => {
    const cache = previewCache.current;
    return () => {
      stopDemo();
      previewAudio.current?.pause();
      cache.forEach((u) => URL.revokeObjectURL(u));
      if (resultUrl.current) URL.revokeObjectURL(resultUrl.current);
    };
  }, []);

  /* ---------- derived ---------- */
  const assignmentFor = useCallback(
    (p: VoicePreset): Assignment => {
      if (status === null) return { kind: "loading" };
      if (demo) return { kind: "demo" };
      if (voicesInfo === null) return { kind: "loading" };
      const ov = overrides[p.id];
      const ovVoice = ov ? voicesInfo.voices.find((v) => v.id === ov) : undefined;
      if (ovVoice) return { kind: "assigned", voiceName: ovVoice.name, overridden: true };
      const def = voicesInfo.presets[p.id];
      return def ? { kind: "assigned", voiceName: def.name, overridden: false } : { kind: "unavailable" };
    },
    [status, demo, voicesInfo, overrides],
  );

  const currentAssignment = assignmentFor(preset);
  const assignedName = currentAssignment.kind === "assigned" && !currentAssignment.overridden ? currentAssignment.voiceName : null;
  const validation = text.trim() ? validateScript(text, modelInfo.maxChars) : null;
  const voiceBlocked = !demo && currentAssignment.kind === "unavailable";
  const canGenerate = !busy && status !== null && text.trim().length > 0 && !validation && !voiceBlocked && (demo || currentAssignment.kind === "assigned");

  /* ---------- actions ---------- */
  function stopAllAudio() {
    stopDemo();
    previewAudio.current?.pause();
    previewAudio.current = null;
    setPreviewingId(null);
    setDemoPlaying(false);
  }

  function selectPreset(p: VoicePreset) {
    setPresetId(p.id);
    setSettings((s) => ({ ...s, speed: p.defaultSpeed, intensity: p.defaultIntensity }));
  }

  function resetDelivery() {
    setSettings((s) => ({ ...s, speed: preset.defaultSpeed, intensity: preset.defaultIntensity, emotion: "neutral", delivery: "conversational" }));
  }

  function insertPause(seconds: number) {
    const ta = textareaRef.current;
    const tag = `<break time="${seconds.toFixed(1)}s" />`;
    const start = ta?.selectionStart ?? text.length;
    const end = ta?.selectionEnd ?? start;
    setText(text.slice(0, start) + tag + text.slice(end));
    requestAnimationFrame(() => {
      ta?.focus();
      ta?.setSelectionRange(start + tag.length, start + tag.length);
    });
  }

  async function requestSpeech(body: object): Promise<{ blob: Blob; voice: string; notes: string[] }> {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error ?? `The request failed (${res.status}).`);
    }
    let voice = "Unknown";
    let notes: string[] = [];
    try {
      const raw = res.headers.get("X-VO-Meta");
      if (raw) {
        const meta = JSON.parse(decodeURIComponent(raw)) as { voice?: string; notes?: string[] };
        voice = meta.voice ?? voice;
        notes = meta.notes ?? [];
      }
    } catch {
      /* metadata is informational only */
    }
    return { blob: await res.blob(), voice, notes };
  }

  async function generate() {
    if (busyRef.current) return;
    setError(null);
    setSuccess(null);

    const problem = validateScript(text, modelInfo.maxChars);
    if (problem) {
      setError(problem);
      return;
    }

    if (demo) {
      toggleDemo();
      return;
    }

    stopAllAudio();
    busyRef.current = true;
    setBusy(true);
    try {
      const { blob, voice, notes } = await requestSpeech({
        text,
        presetId,
        voiceId: overrides[presetId] || undefined,
        model,
        settings: { speed: settings.speed, intensity: settings.intensity, emotion: settings.emotion, delivery: settings.delivery },
      });
      const url = URL.createObjectURL(blob);
      if (resultUrl.current) URL.revokeObjectURL(resultUrl.current);
      resultUrl.current = url;
      const now = new Date();
      setResult({
        url,
        filename: `auravoice-${preset.id}-${stamp(now)}.mp3`,
        presetName: `${preset.name} (${preset.gender})`,
        voiceName: voice,
        model,
        chars: text.length,
        notes,
        createdAt: now.getTime(),
      });
      setHistory((h) =>
        [
          {
            id: uid(),
            createdAt: now.getTime(),
            presetId,
            presetName: preset.name,
            gender: preset.gender,
            voiceName: voice,
            model,
            chars: text.length,
            snippet: text.trim().replace(/\s+/g, " ").slice(0, 80),
            text,
          },
          ...h,
        ].slice(0, MAX_HISTORY),
      );
      setSuccess("Speech generated. Press play to listen or download the MP3.");
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        requestAnimationFrame(() => outputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong while generating speech.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function toggleDemo() {
    if (demoPlaying) {
      stopAllAudio();
      return;
    }
    const problem = validateScript(text, modelInfo.maxChars);
    if (problem) {
      setError(problem);
      return;
    }
    stopAllAudio();
    const ok = speakDemo(text, {
      pitch: preset.demoPitch,
      rate: Math.min(1.4, Math.max(0.6, settings.speed)),
      onEnd: () => setDemoPlaying(false),
    });
    if (!ok) {
      setError("This browser can’t play the built-in demo voice.");
      return;
    }
    setDemoPlaying(true);
    setSuccess("Playing a browser demo voice. This is not AI speech; configure ELEVENLABS_API_KEY for real generation.");
  }

  async function preview(p: VoicePreset) {
    if (previewingId === p.id) {
      stopAllAudio();
      return;
    }
    stopAllAudio();
    setError(null);

    if (demo) {
      const ok = speakDemo(p.previewText, { pitch: p.demoPitch, rate: Math.min(1.4, Math.max(0.6, p.defaultSpeed)), onEnd: () => setPreviewingId(null) });
      if (ok) setPreviewingId(p.id);
      else setError("This browser can’t play the built-in demo voice.");
      return;
    }

    const key = `${p.id}|${overrides[p.id] ?? ""}|${model}`;
    try {
      let url = previewCache.current.get(key);
      if (!url) {
        setPreviewLoadingId(p.id);
        const { blob } = await requestSpeech({
          text: p.previewText,
          presetId: p.id,
          voiceId: overrides[p.id] || undefined,
          model,
          settings: { speed: p.defaultSpeed, intensity: p.defaultIntensity, emotion: "neutral", delivery: "conversational" },
        });
        url = URL.createObjectURL(blob);
        previewCache.current.set(key, url);
      }
      const audio = new Audio(url);
      audio.onended = () => setPreviewingId(null);
      previewAudio.current = audio;
      setPreviewingId(p.id);
      await audio.play();
    } catch (e) {
      setPreviewingId(null);
      setError(e instanceof Error ? e.message : "Preview failed.");
    } finally {
      setPreviewLoadingId(null);
    }
  }

  function reuse(item: HistoryItem) {
    const p = getPreset(item.presetId);
    if (p) {
      setGender(p.gender);
      setPresetId(p.id);
    }
    setText(item.text);
    setSuccess("Script and voice style restored from history.");
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const footer = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={generate} disabled={!canGenerate} className="btn btn-primary px-6 py-3 text-base" aria-busy={busy}>
          <SparkIcon />
          {busy ? "Generating…" : demo ? "Play demo preview" : "Generate speech"}
        </button>
        <p className="text-sm text-muted" aria-live="polite">
          {status === null
            ? "Checking configuration…"
            : busy
              ? "Working… please keep this tab open."
              : validation
                ? validation
                : voiceBlocked
                  ? "Choose a voice in Voice settings to continue."
                  : text.trim()
                    ? `${preset.name} (${preset.gender}) · ${modelInfo.label}`
                    : "Add a script to begin."}
        </p>
      </div>
      {error && (
        <Alert kind="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && !error && (
        <Alert kind="success" onDismiss={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
    </div>
  );

  const overrideVoices = useMemo(() => voicesInfo?.voices ?? [], [voicesInfo]);

  return (
    <div className="min-h-screen">
      <Header mode={mode} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {demo && (
          <div className="mb-5">
            <Alert kind="info">
              <p className="font-semibold">Demo Mode: no ElevenLabs API key is configured.</p>
              <p className="mt-0.5 text-muted">
                You can explore every screen, but real AI speech generation and downloads are switched off. Add <code className="rounded bg-elevated px-1">ELEVENLABS_API_KEY</code>{" "}
                (see the README) and it turns on automatically.
                {!demoSupported() ? "" : " Previews use your browser’s built-in voice instead."}
              </p>
            </Alert>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-7">
            <ScriptEditor
              text={text}
              onChange={setText}
              maxChars={modelInfo.maxChars}
              modelLabel={modelInfo.label}
              disabled={busy}
              textareaRef={textareaRef}
              onClear={() => {
                setText("");
                setError(null);
                setSuccess(null);
              }}
              onSample={() => {
                setText(SAMPLE_SCRIPT);
                setError(null);
              }}
              footer={footer}
            />
            <VoiceLibrary
              gender={gender}
              onGender={setGender}
              presetId={presetId}
              onSelect={selectPreset}
              assignmentFor={assignmentFor}
              previewingId={previewingId}
              previewLoadingId={previewLoadingId}
              onPreview={preview}
              demo={demo}
              voicesError={voicesError}
            />
          </div>

          <div className="space-y-5 lg:col-span-5">
            <OutputPanel
              sectionRef={outputRef}
              busy={busy}
              demo={demo}
              result={result}
              demoPlaying={demoPlaying}
              onDemoToggle={toggleDemo}
              canDemo={demoSupported() && text.trim().length > 0}
            />
            <ControlsPanel
              preset={preset}
              demo={demo}
              model={model}
              onModel={setModel}
              settings={settings}
              onSettings={(patch) => setSettings((s) => ({ ...s, ...patch }))}
              onReset={resetDelivery}
              assignedName={assignedName}
              overrideId={overrides[presetId] ?? ""}
              onOverride={(id) => setOverrides((o) => ({ ...o, [presetId]: id }))}
              voices={overrideVoices}
              onInsertPause={insertPause}
            />
            <HistoryPanel
              items={history}
              onReuse={reuse}
              onRemove={(id) => setHistory((h) => h.filter((x) => x.id !== id))}
              onClear={() => setHistory([])}
            />
          </div>
        </div>

        <footer className="mt-8 border-t border-line pt-4 text-xs text-muted">
          AuraVoice Studio is a prototype. Speech is generated by ElevenLabs when an API key is configured. Only use voices you are authorised to use;
          voice cloning is intentionally not included.
        </footer>
      </main>
    </div>
  );
}
