import type { Metadata } from "next";
import { IncidentForm } from "@/components/admin/IncidentForm";
import { requireAdmin } from "@/lib/status/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New incident" };

export default async function NewIncidentPage() {
  await requireAdmin("/admin/incidents/new");
  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold">New incident</h1>
      <IncidentForm />
    </div>
  );
}
