// Server-only ElevenLabs client. Never import this from a client component.
// The API key is read from process.env and is never logged or returned.

import { DELIVERY_TAGS, EMOTION_TAGS, MODELS } from "../config";
import type { ModelInfo } from "../config";
import type { ParsedGenerateRequest } from "../validate";
import type { VoicePreset } from "../voices";

const API = "https://api.elevenlabs.io/v1";
// 64 kbps keeps a 5,000-character script comfortably below Vercel's ~4.5 MB response cap.
const OUTPUT_FORMAT = "mp3_44100_64";
const TTS_TIMEOUT_MS = 55_000;

export function hasApiKey(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY?.trim());
}

function apiKey(): string {
  return (process.env.ELEVENLABS_API_KEY ?? "").trim();
}

export class ProviderError extends Error {
  constructor(public httpStatus: number, message: string) {
    super(message);
  }
}

export interface ProviderVoice {
  id: string;
  name: string;
  gender?: string;
  category?: string;
}

async function detailOf(res: Response): Promise<string | undefined> {
  try {
    const data: unknown = await res.json();
    if (typeof data === "object" && data !== null && "detail" in data) {
      const d = (data as { detail: unknown }).detail;
      if (typeof d === "string") return d.slice(0, 200);
      if (typeof d === "object" && d !== null && "message" in d && typeof (d as { message: unknown }).message === "string") {
        return (d as { message: string }).message.slice(0, 200);
      }
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

async function toProviderError(res: Response): Promise<ProviderError> {
  const detail = await detailOf(res);
  switch (res.status) {
    case 401:
      return new ProviderError(502, "ElevenLabs rejected the configured API key or its permissions. Check ELEVENLABS_API_KEY (it needs Text to Speech and Voices read access).");
    case 402:
    case 403:
      return new ProviderError(502, `ElevenLabs refused the request (plan or quota limit)${detail ? `: ${detail}` : "."}`);
    case 404:
      return new ProviderError(502, "The selected voice was not found on this ElevenLabs account.");
    case 400:
    case 422:
      return new ProviderError(502, `ElevenLabs rejected the request${detail ? `: ${detail}` : "."}`);
    case 429:
      return new ProviderError(429, "ElevenLabs is rate limiting this account (or too many generations are running at once). Please try again shortly.");
    default:
      return new ProviderError(502, `ElevenLabs returned an error (${res.status}). Please try again.`);
  }
}

function networkError(e: unknown): ProviderError {
  if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
    return new ProviderError(504, "ElevenLabs took too long to respond. Try a shorter script or retry.");
  }
  return new ProviderError(502, "Could not reach ElevenLabs. Please try again.");
}

let voiceCache: { at: number; voices: ProviderVoice[] } | null = null;

export async function listVoices(): Promise<ProviderVoice[]> {
  if (voiceCache && Date.now() - voiceCache.at < 5 * 60_000) return voiceCache.voices;
  let res: Response;
  try {
    res = await fetch(`${API}/voices`, {
      headers: { "xi-api-key": apiKey() },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch (e) {
    throw networkError(e);
  }
  if (!res.ok) throw await toProviderError(res);

  const data = (await res.json()) as { voices?: Array<{ voice_id?: string; name?: string; category?: string; labels?: Record<string, string> }> };
  const voices: ProviderVoice[] = (data.voices ?? [])
    .filter((v): v is { voice_id: string; name: string; category?: string; labels?: Record<string, string> } => Boolean(v.voice_id && v.name))
    .map((v) => ({ id: v.voice_id, name: v.name, category: v.category, gender: v.labels?.gender?.toLowerCase() }))
    .sort((a, b) => a.name.localeCompare(b.name));

  voiceCache = { at: Date.now(), voices };
  return voices;
}

/** Match a preset's preferred names against voices that really exist on the account. */
export function resolvePreset(preset: VoicePreset, voices: ProviderVoice[]): ProviderVoice | null {
  const firstWord = (n: string) => n.split(/[\s\-–—:(]/)[0].toLowerCase();
  for (const want of preset.preferred) {
    const hit = voices.find(
      (v) => firstWord(v.name) === want.toLowerCase() && (!v.gender || v.gender === preset.gender),
    );
    if (hit) return hit;
  }
  return null;
}

export interface BuiltSpeech {
  text: string;
  voiceSettings: Record<string, number | boolean>;
  notes: string[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Translates UI settings into what the model genuinely supports, and records what was applied. */
export function buildSpeech(req: ParsedGenerateRequest, info: ModelInfo = MODELS[req.model]): BuiltSpeech {
  const notes: string[] = [];
  let text = req.text;
  const i = req.intensity / 100;
  const voiceSettings: Record<string, number | boolean> = {};

  if (info.supportsStyle) {
    const stability = round2(Math.min(0.75, Math.max(0.25, 0.75 - 0.5 * i)));
    const style = round2(i * 0.8);
    voiceSettings.stability = stability;
    voiceSettings.similarity_boost = 0.75;
    voiceSettings.style = style;
    voiceSettings.use_speaker_boost = true;
    notes.push(`Intensity ${req.intensity}% → stability ${stability}, style exaggeration ${style}`);
  } else {
    // Eleven v3 only accepts stability in coarse steps (creative / natural / robust).
    const stability = i > 0.66 ? 0.0 : i > 0.33 ? 0.5 : 1.0;
    voiceSettings.stability = stability;
    notes.push(`Intensity ${req.intensity}% → stability ${stability} (${stability === 0 ? "creative" : stability === 0.5 ? "natural" : "robust"})`);
  }

  if (info.supportsSpeed) {
    voiceSettings.speed = round2(req.speed);
    notes.push(`Speed ${round2(req.speed)}×`);
  }

  if (info.supportsAudioTags) {
    const tags = [EMOTION_TAGS[req.emotion], DELIVERY_TAGS[req.delivery]].filter(Boolean).join(" ");
    if (tags) {
      text = `${tags} ${text}`;
      notes.push(`Added audio tags ${tags} (interpreted by the model, not guaranteed)`);
    }
  } else if (req.emotion !== "neutral" || req.delivery !== "conversational") {
    notes.push("Emotion and delivery style were ignored: this model has no way to apply them");
  }

  if (!info.supportsBreakTags && /<break[^>]*\/>/i.test(text)) {
    text = text.replace(/<break[^>]*\/>/gi, "... ");
    notes.push("Pause tags were converted to ellipses for this model");
  }

  return { text, voiceSettings, notes };
}

export async function synthesize(args: { voiceId: string; model: string; built: BuiltSpeech }): Promise<ArrayBuffer> {
  let res: Response;
  try {
    res = await fetch(`${API}/text-to-speech/${encodeURIComponent(args.voiceId)}?output_format=${OUTPUT_FORMAT}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey(),
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({ text: args.built.text, model_id: args.model, voice_settings: args.built.voiceSettings }),
      signal: AbortSignal.timeout(TTS_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (e) {
    throw networkError(e);
  }
  if (!res.ok) throw await toProviderError(res);
  return res.arrayBuffer();
}
