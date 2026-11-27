import { PageShell } from "@/components/status/PageShell";
import { StatusBoard } from "@/components/status/StatusBoard";
import { getStatusSummary } from "@/lib/status/summary";

export const dynamic = "force-dynamic";

export default async function Home() {
  const summary = await getStatusSummary();
  return (
    <PageShell>
      <StatusBoard initial={summary} />
    </PageShell>
  );
}
