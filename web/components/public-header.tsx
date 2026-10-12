"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { BrandMark } from "@/components/brand-mark";

export function PublicHeader() {
  const { data: session, isPending } = authClient.useSession();

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-canvas/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-6 max-sm:px-4">
        <Link className="group inline-flex items-center gap-3 text-sm font-semibold tracking-[-0.01em] text-ink" href="/" aria-label="Synapse home">
          <BrandMark className="h-5 w-[22px] text-brand transition-colors group-hover:text-brand-light" />
          <span>Synapse</span>
        </Link>

        <nav className="flex items-center gap-2" aria-label="Primary navigation">
          {!isPending && session ? (
            <Link className="inline-flex min-h-10 items-center border border-brand bg-brand px-4 text-sm font-semibold text-canvas transition-colors hover:bg-brand-light" href="/dashboard">
              Open dashboard
            </Link>
          ) : (
            <>
              <Link className="inline-flex min-h-10 items-center px-3 text-sm text-soft transition-colors hover:text-ink" href="/sign-in">
                Sign in
              </Link>
              <Link className="inline-flex min-h-10 items-center border border-brand bg-brand px-4 text-sm font-semibold text-canvas transition-colors hover:bg-brand-light" href="/sign-up">
                Create account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
