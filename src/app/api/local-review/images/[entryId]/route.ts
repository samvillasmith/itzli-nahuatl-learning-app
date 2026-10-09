import { localReviewImageResponse } from "@/lib/local-review-word-images";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ entryId: string }> }) {
  const { entryId } = await params;
  return localReviewImageResponse(entryId, new URL(request.url).searchParams.get("v")) ??
    new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
}
