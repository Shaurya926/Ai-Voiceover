import { DELIVERIES, EMOTIONS, MODELS, SPEED_MAX, SPEED_MIN, isModelId } from "./config";
import type { Delivery, Emotion, ModelId } from "./config";
import { getPreset } from "./voices";

/** Shared by the client (friendly feedback) and the server (authoritative check). */
export function validateScript(text: string, max: number): string | null {
  const t = text.trim();
  if (!t) return "Write or paste a script first.";
  if (text.length > max) {
    return `The script is ${text.length.toLocaleString()} characters; the limit for this model is ${max.toLocaleString()}.`;
  }
  if (!/[A-Za-z0-9À-￿]/.test(t)) return "The script needs some words to speak.";
  return null;
}

export interface ParsedGenerateRequest {
  text: string;
  presetId: string;
  voiceId?: string;
  model: ModelId;
  speed: number;
  intensity: number;
  emotion: Emotion;
  delivery: Delivery;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function parseGenerateRequest(body: unknown): ParsedGenerateRequest | { error: string } {
  if (!isRecord(body)) return { error: "Invalid request body." };

  const model = body.model;
  if (!isModelId(model)) return { error: "Unsupported model." };

  if (typeof body.text !== "string") return { error: "Script text is required." };
  const textError = validateScript(body.text, MODELS[model].maxChars);
  if (textError) return { error: textError };

  if (typeof body.presetId !== "string" || !getPreset(body.presetId)) return { error: "Unknown voice preset." };

  let voiceId: string | undefined;
  if (body.voiceId !== undefined && body.voiceId !== null && body.voiceId !== "") {
    if (typeof body.voiceId !== "string" || !/^[A-Za-z0-9]{8,64}$/.test(body.voiceId)) {
      return { error: "Invalid voice selection." };
    }
    voiceId = body.voiceId;
  }

  const s = isRecord(body.settings) ? body.settings : {};
  const speed = typeof s.speed === "number" ? s.speed : 1;
  const intensity = typeof s.intensity === "number" ? s.intensity : 50;
  if (!Number.isFinite(speed) || speed < SPEED_MIN - 1e-9 || speed > SPEED_MAX + 1e-9) {
    return { error: `Speed must be between ${SPEED_MIN} and ${SPEED_MAX}.` };
  }
  if (!Number.isFinite(intensity) || intensity < 0 || intensity > 100) {
    return { error: "Intensity must be between 0 and 100." };
  }
  const emotion = (s.emotion ?? "neutral") as Emotion;
  const delivery = (s.delivery ?? "conversational") as Delivery;
  if (!EMOTIONS.includes(emotion)) return { error: "Unsupported emotion." };
  if (!DELIVERIES.includes(delivery)) return { error: "Unsupported delivery style." };

  return { text: body.text.trim(), presetId: body.presetId, voiceId, model, speed, intensity, emotion, delivery };
}
