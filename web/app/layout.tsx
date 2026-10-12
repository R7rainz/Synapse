import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Synapse — LLM gateway",
  description: "A secure gateway for model access, API keys, and retrieval-aware applications.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas font-sans text-ink antialiased">
        <header className="sticky top-0 z-50 border-b border-line bg-canvas/95 backdrop-blur-sm">
          <div className="mx-auto flex h-[52px] w-[min(1200px,calc(100%-2rem))] items-center justify-between gap-8 max-md:w-[calc(100%-1rem)]">
            <Link className="group inline-flex items-center gap-2.5 font-mono text-xs text-soft no-underline" href="/" aria-label="Synapse home">
              <svg className="h-4 w-[18px] fill-current text-brand transition-colors group-hover:text-ink" viewBox="0 0 36 32" aria-hidden="true">
                <path d="M0 5 5 0h3v13h5l4-4v8l-3 3H8v12H0Z" />
                <path d="M20 0h16v7H23l-3 3v12l3 3h13l-7 7h-9l-7-7V7Z" />
              </svg>
              <span>synapse.dev</span>
            </Link>
            <nav className="flex items-center gap-5 font-mono text-[0.68rem] text-muted" aria-label="Primary navigation">
              <Link className="transition-colors hover:text-ink" href="/dashboard">console</Link>
              <Link className="transition-colors hover:text-ink max-sm:hidden" href="/profile">identity</Link>
              <Link className="transition-colors hover:text-ink max-sm:hidden" href="/sign-in">sign in</Link>
              <Link className="border border-line-strong px-2.5 py-1.5 text-soft transition-colors hover:border-brand hover:text-brand" href="/sign-up">initialize ↩</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-[min(1200px,calc(100%-2rem))] max-md:w-[calc(100%-1rem)]">{children}</main>
      </body>
    </html>
  );
}
