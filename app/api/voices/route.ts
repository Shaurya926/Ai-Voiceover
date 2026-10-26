import { PRESETS } from "@/lib/voices";
import { ProviderError, hasApiKey, listVoices, resolvePreset } from "@/lib/server/elevenlabs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  if (!hasApiKey()) {
    return Response.json({ demo: true, voices: [], presets: {} }, { headers });
  }
  try {
    const voices = await listVoices();
    const presets: Record<string, { id: string; name: string } | null> = {};
    for (const p of PRESETS) {
      const v = resolvePreset(p, voices);
      presets[p.id] = v ? { id: v.id, name: v.name } : null;
    }
    return Response.json({ demo: false, voices, presets }, { headers });
  } catch (e) {
    const err = e instanceof ProviderError ? e : new ProviderError(502, "Could not load voices from ElevenLabs.");
    console.error("[voices] provider error", err.httpStatus);
    return Response.json({ error: err.message }, { status: err.httpStatus, headers });
  }
}
