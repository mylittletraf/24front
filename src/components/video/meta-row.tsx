import type { ReactNode } from "react";

/**
 * One row of the video metadata definition list: a muted label aligned against
 * a wrapping row of chips. Renders a <dt>/<dd> fragment so the parent grid can
 * align the label column across every row.
 */
export function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted flex h-8 items-center font-semibold">{label}</dt>
      <dd className="flex flex-wrap items-center gap-2">{children}</dd>
    </>
  );
}
