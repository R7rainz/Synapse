"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { BrandMark } from "@/components/brand-mark";
import { authClient } from "@/lib/auth-client";

const navigationGroups = [
  {
    label: "Observe",
    items: [
      { href: "/dashboard", label: "Overview" },
      { href: "/dashboard/requests", label: "Requests" },
    ],
  },
  {
    label: "Build",
    items: [
      { href: "/dashboard/playground", label: "Playground" },
      { href: "/dashboard/documents", label: "Knowledge" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/dashboard/api-keys", label: "API keys" },
      { href: "/dashboard/account", label: "Account" },
    ],
  },
] as const;

function WorkspaceNavigation({ pathname, compact = false }: { pathname: string; compact?: boolean }) {
  return (
    <nav className={compact ? "flex min-w-max gap-1" : "grid gap-5 px-3"} aria-label="Workspace navigation">
      {navigationGroups.map((group) => (
        <div className={compact ? "contents" : "grid gap-1"} key={group.label}>
          {!compact && <p className="px-3 pb-1 font-mono text-[0.6rem] tracking-[0.1em] text-muted uppercase">{group.label}</p>}
          {group.items.map((item) => {
            const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                className={`group flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors max-lg:min-h-11 ${
                  active
                    ? "bg-raised text-ink"
                    : "text-muted hover:bg-raised/60 hover:text-soft"
                }`}
                href={item.href}
                key={item.href}
                aria-current={active ? "page" : undefined}
              >
                <span className={`size-1.5 rounded-full ${active ? "bg-brand" : "bg-line-strong group-hover:bg-muted"}`} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
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

  const pageLabel = pathname === "/dashboard" ? "Overview" : pathname.split("/").at(-1)?.replaceAll("-", " ");

  return (
    <div className="min-h-svh bg-canvas lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-svh flex-col border-r border-line bg-surface lg:flex">
        <Link className="flex h-16 items-center gap-3 border-b border-line px-5 text-sm font-semibold text-ink" href="/">
          <BrandMark className="h-5 w-[22px] text-brand" />
          <span className="tracking-[-0.02em]">Synapse</span>
        </Link>

        <div className="px-5 pt-6 pb-5">
          <p className="m-0 text-sm font-medium text-soft">Workspace</p>
          <p className="mt-1 mb-0 text-xs text-muted">Gateway operations</p>
        </div>
        <WorkspaceNavigation pathname={pathname} />

        <div className="mt-auto flex items-center gap-3 border-t border-line p-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-raised text-sm font-medium text-soft" aria-hidden="true">{session.user.name?.charAt(0).toUpperCase() || "U"}</span>
          <div className="min-w-0">
            <p className="m-0 truncate text-sm text-soft">{session.user.name || "Account"}</p>
            <p className="mt-0.5 mb-0 truncate text-xs text-muted">{session.user.email}</p>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur-xl">
          <div className="hidden h-14 items-center justify-between gap-6 px-[clamp(1.25rem,4vw,3rem)] lg:flex">
            <p className="m-0 text-sm font-medium text-soft">{pageLabel}</p>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted">{session.user.email}</span>
              <span className="flex items-center gap-2 text-xs text-soft"><span className="size-1.5 rounded-full bg-positive" aria-hidden="true" />Operational</span>
            </div>
          </div>
          <div className="flex h-14 items-center justify-between px-4 lg:hidden">
            <Link className="flex items-center gap-2.5 text-sm font-semibold text-ink" href="/">
              <BrandMark className="h-4 w-[18px] text-brand" />
              <span>Synapse</span>
            </Link>
            <span className="max-w-40 truncate text-xs text-muted">{session.user.name || session.user.email}</span>
          </div>
          <div className="overflow-x-auto border-t border-line px-2 lg:hidden">
            <WorkspaceNavigation pathname={pathname} compact />
          </div>
        </header>

        <main className="min-h-svh min-w-0 animate-page-in">{children}</main>
      </div>
    </div>
  );
}
