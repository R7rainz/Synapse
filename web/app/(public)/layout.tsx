import type { ReactNode } from "react";
import { PublicHeader } from "@/components/public-header";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PublicHeader />
      <main>{children}</main>
    </>
  );
}
