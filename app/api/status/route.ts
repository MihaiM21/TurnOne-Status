import { getStatusSummary } from "@/lib/status/summary";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function GET() {
  const summary = await getStatusSummary();
  return Response.json(summary, {
    headers: {
      ...CORS,
      "Cache-Control": "public, max-age=15",
    },
  });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: { ...CORS, "Access-Control-Max-Age": "86400" } });
}
