import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { T1Mark } from "@/components/status/T1Mark";
import { adminConfigured, isAdmin, safeNext } from "@/lib/status/auth";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ next?: string | string[] }> };

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const next = safeNext(Array.isArray(sp.next) ? sp.next[0] : sp.next);
  if (adminConfigured() && (await isAdmin())) redirect(next);
  return (
    <div className="mx-auto mt-10 w-full max-w-sm rounded-xl border border-line bg-card p-6">
      <div className="mb-6 flex items-center gap-3">
        <T1Mark size={28} />
        <div>
          <h1 className="text-lg font-semibold leading-tight">Admin sign in</h1>
          <p className="label mt-1.5">Turn One Status</p>
        </div>
      </div>
      {adminConfigured() ? (
        <LoginForm next={next} />
      ) : (
        <p role="alert" className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-muted">
          Admin is not configured.
        </p>
      )}
    </div>
  );
}
