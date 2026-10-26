import { DEFAULT_MODEL, isModelId } from "@/lib/config";
import { hasApiKey } from "@/lib/server/elevenlabs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const envModel = process.env.ELEVENLABS_MODEL;
  return Response.json(
    {
      demo: !hasApiKey(),
      defaultModel: isModelId(envModel) ? envModel : DEFAULT_MODEL,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
