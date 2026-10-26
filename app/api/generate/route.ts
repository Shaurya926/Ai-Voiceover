import type { NextRequest } from "next/server";
import { MODELS } from "@/lib/config";
import { getPreset } from "@/lib/voices";
import { parseGenerateRequest } from "@/lib/validate";
import { ProviderError, buildSpeech, hasApiKey, listVoices, resolvePreset, synthesize } from "@/lib/server/elevenlabs";
import { acquireSlot, checkRate, clientKey, releaseSlot } from "@/lib/server/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "no-store" };

function fail(error: string, status: number, extra: Record<string, string> = {}) {
  return Response.json({ error }, { status, headers: { ...NO_STORE, ...extra } });
}

export async function POST(req: NextRequest) {
  if (!hasApiKey()) {
    return fail("Real speech generation is not configured. Add ELEVENLABS_API_KEY to leave Demo Mode.", 503);
  }

  const raw = await req.text();
  if (raw.length > 40_000) return fail("Request is too large.", 413);

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail("Request body must be valid JSON.", 400);
  }

  const parsed = parseGenerateRequest(body);
  if ("error" in parsed) return fail(parsed.error, 400);

  const rate = checkRate(clientKey(req.headers));
  if (!rate.ok) {
    return fail(`You're generating too quickly. Please wait ${rate.retryAfter}s and try again.`, 429, {
      "Retry-After": String(rate.retryAfter),
    });
  }

  if (!acquireSlot()) {
    return fail("The studio is busy with other requests. Please retry in a few seconds.", 429, { "Retry-After": "5" });
  }

  try {
    const voices = await listVoices();
    const preset = getPreset(parsed.presetId)!;

    // Only voices that exist on the configured account are accepted.
    let voice = parsed.voiceId ? voices.find((v) => v.id === parsed.voiceId) : resolvePreset(preset, voices);
    if (!voice) {
      return fail(
        parsed.voiceId
          ? "That voice is not available on this account."
          : `No suitable voice is available for “${preset.name}”. Choose another voice in the settings panel.`,
        400,
      );
    }

    const built = buildSpeech(parsed, MODELS[parsed.model]);
    const audio = await synthesize({ voiceId: voice.id, model: parsed.model, built });

    const meta = encodeURIComponent(JSON.stringify({ voice: voice.name, notes: built.notes }));
    return new Response(audio, {
      status: 200,
      headers: {
        ...NO_STORE,
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audio.byteLength),
        "X-VO-Meta": meta,
      },
    });
  } catch (e) {
    if (e instanceof ProviderError) {
      console.error("[generate] provider error", e.httpStatus);
      return fail(e.message, e.httpStatus);
    }
    console.error("[generate] unexpected error");
    return fail("Something went wrong while generating speech.", 500);
  } finally {
    releaseSlot();
  }
}
