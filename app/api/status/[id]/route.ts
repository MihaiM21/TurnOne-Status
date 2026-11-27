import { getComponentSummary } from "@/lib/status/summary";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const found = await getComponentSummary(id);
  if (!found) {
    return Response.json({ error: "Unknown component", id }, { status: 404, headers: CORS });
  }
  return Response.json(found.component, {
    headers: { ...CORS, "Cache-Control": "public, max-age=15" },
  });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: { ...CORS, "Access-Control-Max-Age": "86400" } });
}
