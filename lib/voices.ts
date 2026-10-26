import type { Gender } from "./config";

/**
 * A voice STYLE preset: descriptive metadata plus starting delivery values and a
 * list of preferred provider voice names. It is NOT a voice identity. The server
 * resolves `preferred` against the voices actually available on the configured
 * ElevenLabs account; if none match, the preset shows as unavailable and the user
 * can pick any other supported voice. No voice IDs are hard-coded here.
 */
export interface VoicePreset {
  id: string;
  gender: Gender;
  name: string;
  pitch: string;
  tone: string;
  bestFor: string;
  preferred: string[];
  defaultSpeed: number;
  defaultIntensity: number;
  previewText: string;
  /** Pitch used only by the browser demo voice (0–2). */
  demoPitch: number;
}

type Base = Omit<VoicePreset, "id" | "gender" | "preferred" | "demoPitch"> & {
  male: string[];
  female: string[];
  demoPitch: number;
  nameFemale?: string;
  nameMale?: string;
  pitchFemale?: string;
  toneMale?: string;
  toneFemale?: string;
  bestForMale?: string;
  bestForFemale?: string;
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const BASES: Base[] = [
  {
    name: "Deep Cinematic", pitch: "Low", tone: "Rich, resonant, commanding", bestFor: "Trailers, dramatic narration",
    defaultSpeed: 0.9, defaultIntensity: 70, previewText: "In a world on the edge of silence, one voice will rise.",
    demoPitch: 0.6, male: ["Adam", "Brian", "Josh", "Bill"], female: ["Charlotte", "Dorothy", "Domi"],
  },
  {
    name: "Intimidating", pitch: "Low–medium", tone: "Cold, confident, forceful", bestFor: "Fictional villains, action scenes",
    defaultSpeed: 0.95, defaultIntensity: 80, previewText: "You should have run while you still had the chance.",
    demoPitch: 0.75, male: ["Clyde", "Arnold", "Daniel", "George"], female: ["Domi", "Nicole", "Alice"],
  },
  {
    name: "Seductive", pitch: "Medium–low", tone: "Smooth, intimate, confident", bestFor: "Romantic fiction, mature storytelling",
    defaultSpeed: 0.9, defaultIntensity: 45, previewText: "Come a little closer. I have a story to tell you tonight.",
    demoPitch: 0.8, male: ["Callum", "Antoni", "Harry"], female: ["Nicole", "Charlotte", "Sarah"],
  },
  {
    name: "Professional", pitch: "Medium", tone: "Articulate, polished, composed", bestFor: "Corporate narration, presentations",
    defaultSpeed: 1.0, defaultIntensity: 30, previewText: "Welcome to today's briefing. Let's walk through the quarterly results.",
    demoPitch: 1.0, male: ["Daniel", "Chris", "Eric", "Antoni"], female: ["Rachel", "Alice", "Jessica", "Matilda"],
  },
  {
    name: "Friendly", pitch: "Medium–high", tone: "Warm, welcoming, conversational", bestFor: "Tutorials, educational videos",
    defaultSpeed: 1.05, defaultIntensity: 40, previewText: "Hey there! Thanks for stopping by. Let's get started.",
    demoPitch: 1.1, male: ["Sam", "Charlie", "Liam", "Chris"], female: ["Sarah", "Jessica", "Lily", "Elli"],
  },
  {
    name: "Energetic", pitch: "High–medium", tone: "Lively, enthusiastic, expressive", bestFor: "Gaming, entertainment, promotions",
    defaultSpeed: 1.15, defaultIntensity: 75, previewText: "Are you ready? The biggest event of the year starts right now!",
    demoPitch: 1.2, male: ["Charlie", "Liam", "Josh"], female: ["Jessica", "Elli", "Lily"],
  },
  {
    name: "Anime Hero", nameFemale: "Anime Heroine", pitch: "Medium–high", tone: "Expressive, determined, emotionally dynamic",
    bestFor: "Anime-inspired storytelling", defaultSpeed: 1.1, defaultIntensity: 80,
    previewText: "I won't give up! Not now, not ever. This is where we make our stand!",
    demoPitch: 1.2, male: ["Liam", "Josh", "Charlie"], female: ["Elli", "Lily", "Jessica", "Bella"],
  },
  {
    name: "Villainous", nameFemale: "Mystical", pitch: "Low–medium", tone: "Menacing, theatrical, sinister",
    toneFemale: "Ethereal, mysterious, atmospheric", pitchFemale: "Medium–low",
    bestFor: "Fictional villains, dark fantasy", bestForFemale: "Fantasy, supernatural stories",
    defaultSpeed: 0.9, defaultIntensity: 85, previewText: "Every plan you have ever made was already mine to break.",
    demoPitch: 0.7, male: ["Callum", "Clyde", "Daniel"], female: ["Freya", "Charlotte", "Grace"],
  },
  {
    name: "Emotional", pitch: "Medium", tone: "Sensitive, heartfelt, expressive", bestFor: "Drama, emotional narration",
    defaultSpeed: 0.9, defaultIntensity: 60, previewText: "I never told you how much those quiet evenings meant to me.",
    demoPitch: 0.95, male: ["Antoni", "Eric", "Josh"], female: ["Bella", "Grace", "Sarah"],
  },
  {
    name: "Calm Narrator", pitch: "Medium–low", tone: "Gentle, composed, soothing", bestFor: "Audiobooks, meditation, documentaries",
    defaultSpeed: 0.9, defaultIntensity: 15, previewText: "Take a slow breath in, and let the day settle around you.",
    demoPitch: 0.85, male: ["George", "Bill", "Brian", "Adam"], female: ["Matilda", "Rachel", "Grace", "Dorothy"],
  },
];

function build(gender: Gender): VoicePreset[] {
  return BASES.map((b) => {
    const isF = gender === "female";
    const name = isF ? b.nameFemale ?? b.name : b.nameMale ?? b.name;
    return {
      id: `${gender === "male" ? "m" : "f"}-${slug(name)}`,
      gender,
      name,
      pitch: isF ? b.pitchFemale ?? b.pitch : b.pitch,
      tone: isF ? b.toneFemale ?? b.tone : b.toneMale ?? b.tone,
      bestFor: isF ? b.bestForFemale ?? b.bestFor : b.bestForMale ?? b.bestFor,
      preferred: isF ? b.female : b.male,
      defaultSpeed: b.defaultSpeed,
      defaultIntensity: b.defaultIntensity,
      previewText: b.previewText,
      demoPitch: Math.min(2, b.demoPitch + (isF ? 0.3 : 0)),
    };
  });
}

export const MALE_PRESETS = build("male");
export const FEMALE_PRESETS = build("female");
export const PRESETS: VoicePreset[] = [...MALE_PRESETS, ...FEMALE_PRESETS];

export function getPreset(id: string): VoicePreset | undefined {
  return PRESETS.find((p) => p.id === id);
}
