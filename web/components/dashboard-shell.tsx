"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { BrandMark } from "@/components/brand-mark";
import { authClient } from "@/lib/auth-client";

const navigation = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/requests", label: "Requests" },
  { href: "/dashboard/api-keys", label: "API keys" },
  { href: "/dashboard/playground", label: "Playground" },
  { href: "/dashboard/documents", label: "Knowledge" },
  { href: "/dashboard/account", label: "Account" },
];

function WorkspaceNavigation({ pathname }: { pathname: string }) {
  return (
    <nav className="flex gap-1 max-lg:min-w-max lg:grid" aria-label="Workspace navigation">
      {navigation.map((item) => {
        const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            className={`flex min-h-11 items-center border-l-2 px-4 text-sm transition-colors max-lg:border-l-0 max-lg:border-b-2 lg:px-3 ${
              active
                ? "border-brand bg-raised text-ink"
                : "border-transparent text-muted hover:bg-raised/60 hover:text-soft"
            }`}
            href={item.href}
            key={item.href}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) router.replace("/sign-in");
  }, [isPending, router, session]);

  if (isPending || !session) {
    return (
      <div className="grid min-h-svh place-items-center bg-canvas font-mono text-xs text-muted" role="status">
        <span>{isPending ? "Loading workspace…" : "Redirecting to sign in…"}</span>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-canvas lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-svh flex-col border-r border-line bg-surface lg:flex">
        <Link className="flex h-16 items-center gap-3 border-b border-line px-5 text-sm font-semibold text-ink" href="/">
          <BrandMark className="h-5 w-[22px] text-brand" />
          <span>Synapse</span>
        </Link>

        <div className="px-4 pt-7 pb-3 font-mono text-[0.64rem] tracking-[0.14em] text-muted uppercase">Workspace</div>
        <WorkspaceNavigation pathname={pathname} />

        <div className="mt-auto border-t border-line p-4">
          <p className="m-0 truncate text-sm text-soft">{session.user.name || "Account"}</p>
          <p className="mt-1 mb-0 truncate font-mono text-[0.65rem] text-muted">{session.user.email}</p>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur-xl lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link className="flex items-center gap-2.5 text-sm font-semibold text-ink" href="/">
              <BrandMark className="h-4 w-[18px] text-brand" />
              <span>Synapse</span>
            </Link>
            <span className="max-w-40 truncate text-xs text-muted">{session.user.name || session.user.email}</span>
          </div>
          <div className="overflow-x-auto border-t border-line px-2">
            <WorkspaceNavigation pathname={pathname} />
          </div>
        </header>

        <main className="min-h-svh min-w-0 animate-page-in">{children}</main>
      </div>
    </div>
  );
}
