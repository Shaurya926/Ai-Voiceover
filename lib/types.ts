import type { Gender, ModelId } from "./config";

export interface VoiceOption {
  id: string;
  name: string;
  gender?: string;
  category?: string;
}

export interface HistoryItem {
  id: string;
  createdAt: number;
  presetId: string;
  presetName: string;
  gender: Gender;
  voiceName: string;
  model: ModelId;
  chars: number;
  snippet: string;
  /** Full script, so it can be reloaded. Audio itself is never stored. */
  text: string;
}

export interface GenResult {
  url: string;
  filename: string;
  presetName: string;
  voiceName: string;
  model: ModelId;
  chars: number;
  notes: string[];
  createdAt: number;
}
