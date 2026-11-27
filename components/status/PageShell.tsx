import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/** Header + main landmark + footer. Reuse on every public page. */
export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 pt-6">{children}</main>
      <SiteFooter />
    </>
  );
}
