import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComponentDetail } from "@/components/status/ComponentDetail";
import { PageShell } from "@/components/status/PageShell";
import { getComponentSummary } from "@/lib/status/summary";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const found = await getComponentSummary(id);
  return { title: found ? found.component.name : "Not found" };
}

export default async function ComponentPage({ params }: Props) {
  const { id } = await params;
  const found = await getComponentSummary(id);
  if (!found) notFound();
  return (
    <PageShell>
      <ComponentDetail initial={found.summary} id={found.component.id} />
    </PageShell>
  );
}
