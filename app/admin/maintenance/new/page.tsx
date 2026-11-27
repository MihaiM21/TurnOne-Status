import type { Metadata } from "next";
import { MaintenanceForm } from "@/components/admin/MaintenanceForm";
import { requireAdmin } from "@/lib/status/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Schedule maintenance" };

export default async function NewMaintenancePage() {
  await requireAdmin("/admin/maintenance/new");
  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold">Schedule maintenance</h1>
      <MaintenanceForm />
    </div>
  );
}
