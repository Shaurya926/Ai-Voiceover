// Shared (client + server) configuration. No secrets here.

export type ModelId = "eleven_multilingual_v2" | "eleven_v3";
export type Gender = "male" | "female";

export interface ModelInfo {
  id: ModelId;
  label: string;
  blurb: string;
  /**
   * Character limit enforced by this app. ElevenLabs allows more on some models,
   * but responses from Vercel serverless functions are capped at ~4.5 MB, so the
   * app keeps one request to a size that comfortably fits (see README).
   */
  maxChars: number;
  supportsSpeed: boolean;
  supportsStyle: boolean;
  /** SSML-style <break time="1.0s" /> tags. */
  supportsBreakTags: boolean;
  /** Inline audio tags such as [excited]. */
  supportsAudioTags: boolean;
}

export const MODELS: Record<ModelId, ModelInfo> = {
  eleven_multilingual_v2: {
    id: "eleven_multilingual_v2",
    label: "Multilingual v2",
    blurb: "Stable, high quality. Supports speed, intensity (style) and pause tags.",
    maxChars: 5000,
    supportsSpeed: true,
    supportsStyle: true,
    supportsBreakTags: true,
    supportsAudioTags: false,
  },
  eleven_v3: {
    id: "eleven_v3",
    label: "Eleven v3 (alpha)",
    blurb: "Most expressive. Emotion and delivery are steered with inline audio tags; no speed or pause tags.",
    maxChars: 5000,
    supportsSpeed: false,
    supportsStyle: false,
    supportsBreakTags: false,
    supportsAudioTags: true,
  },
};

export const DEFAULT_MODEL: ModelId = "eleven_multilingual_v2";

export function isModelId(v: unknown): v is ModelId {
  return typeof v === "string" && v in MODELS;
}

export const EMOTIONS = ["neutral", "happy", "sad", "angry", "excited", "mysterious", "confident"] as const;
export type Emotion = (typeof EMOTIONS)[number];

export const DELIVERIES = ["conversational", "cinematic", "assertive", "intimate", "narration"] as const;
export type Delivery = (typeof DELIVERIES)[number];

/** Best-effort audio tags for Eleven v3. The model interprets them; results are not guaranteed. */
export const EMOTION_TAGS: Record<Emotion, string> = {
  neutral: "",
  happy: "[happy]",
  sad: "[sad]",
  angry: "[angry]",
  excited: "[excited]",
  mysterious: "[mysterious]",
  confident: "[confident]",
};

export const DELIVERY_TAGS: Record<Delivery, string> = {
  conversational: "",
  cinematic: "[dramatic]",
  assertive: "[firm]",
  intimate: "[whispers]",
  narration: "[calm]",
};

export const SPEED_MIN = 0.7;
export const SPEED_MAX = 1.2;

export const SAMPLE_SCRIPT = `Welcome to AuraVoice Studio.

Every great story starts with a single voice. Today, that voice is yours to shape: choose a style, set the pace, and let your words come alive.

Thank you for listening.`;

export interface DeliverySettings {
  speed: number; // 0.7 - 1.2
  intensity: number; // 0 - 100
  emotion: Emotion;
  delivery: Delivery;
}
