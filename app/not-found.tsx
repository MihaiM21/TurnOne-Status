import Link from "next/link";
import { PageShell } from "@/components/status/PageShell";

export default function NotFound() {
  return (
    <PageShell>
      <section className="relative overflow-hidden rounded-xl border border-line bg-card py-10 pl-7 pr-5 sm:pl-9">
        <div aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-crimson" />
        <p className="label">Error 404</p>
        <h1 className="display mt-3 text-[40px] font-bold leading-[0.95] sm:text-[56px]">Off the track</h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
          That page or component does not exist. It may have been renamed or removed.
        </p>
        <Link
          href="/"
          className="t-fast mt-6 inline-flex h-9 items-center gap-2 rounded-md border border-line bg-surface px-4 text-[13px] hover:bg-elevated"
        >
          <span aria-hidden="true">←</span> All systems
        </Link>
      </section>
    </PageShell>
  );
}
