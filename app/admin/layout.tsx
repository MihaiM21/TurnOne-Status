import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { PageShell } from "@/components/status/PageShell";
import { isAdmin } from "@/lib/status/auth";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · Turn One Status" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authed = await isAdmin();
  return (
    <PageShell>
      {authed && <AdminNav />}
      {children}
    </PageShell>
  );
}
