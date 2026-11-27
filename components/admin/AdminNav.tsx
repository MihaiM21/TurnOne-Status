import Link from "next/link";
import { logoutAction } from "@/app/admin/actions";

export function AdminNav() {
  const link = "t-fast text-[13px] text-muted hover:text-fg";
  return (
    <nav aria-label="Admin" className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line pb-3">
      <span className="label text-crimson">Admin</span>
      <Link href="/admin" className={link}>
        Dashboard
      </Link>
      <Link href="/admin/incidents/new" className={link}>
        New incident
      </Link>
      <Link href="/admin/maintenance/new" className={link}>
        Schedule maintenance
      </Link>
      <Link href="/" className={link}>
        Public page
      </Link>
      <form action={logoutAction} className="ml-auto">
        <button type="submit" className={link}>
          Sign out
        </button>
      </form>
    </nav>
  );
}
