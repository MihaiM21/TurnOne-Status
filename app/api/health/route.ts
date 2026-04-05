import { fetchAllHealthChecks } from "@/lib/health-service";

export async function GET() {
  try {
    const services = await fetchAllHealthChecks();
    return Response.json(services);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
