const LINKS: { href: string; label: string; external?: boolean }[] = [
  { href: "/feed.xml", label: "Atom feed" },
  { href: "https://discord.gg/rFWq3F6C8t", label: "Discord", external: true },
  { href: "/api/status", label: "JSON API" },
  { href: "https://turnonehub.com", label: "turnonehub.com", external: true },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto w-full max-w-[1120px] px-4 py-8">
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="t-fast text-[13px] text-muted hover:text-fg"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="mt-6 flex flex-col gap-2 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>Turn One is an independent project, not affiliated with Formula 1 or the FIA.</p>
          <p className="label">Powered by Turn One</p>
        </div>
      </div>
    </footer>
  );
}
