"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { BrandMark } from "@/components/brand-mark";

export function PublicHeader() {
  const { data: session, isPending } = authClient.useSession();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-paper/90 backdrop-blur-xl">
      <div className="mx-auto grid h-[4.5rem] w-full max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-6 px-6 max-md:grid-cols-[1fr_auto] max-sm:px-4">
        <Link className="group inline-flex items-center gap-3 text-sm font-semibold tracking-[-0.01em] text-ink-dark" href="/" aria-label="Synapse home">
          <BrandMark className="h-5 w-[22px] text-brand transition-colors group-hover:text-deep-green" />
          <span>Synapse</span>
        </Link>

        {pathname === "/" ? (
          <nav className="flex items-center gap-6 text-xs text-body-dark max-md:hidden" aria-label="Primary navigation">
            <Link className="transition-colors hover:text-deep-green" href="/#capabilities">Capabilities</Link>
            <Link className="transition-colors hover:text-deep-green" href="/#how-it-works">How it works</Link>
            <Link className="transition-colors hover:text-deep-green" href="/#boundary">Boundary</Link>
          </nav>
        ) : <span aria-hidden="true" />}

        <nav className="flex items-center justify-end gap-2" aria-label="Account navigation">
          {!isPending && session ? (
            <Link className="button-primary min-h-10 px-4" href="/dashboard">
              Open dashboard
            </Link>
          ) : (
            <>
              <Link className="button-secondary min-h-10 px-3 text-body-dark" href="/sign-in">
                Sign in
              </Link>
              <Link className="button-primary min-h-10 px-4" href="/sign-up">
                Create account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
