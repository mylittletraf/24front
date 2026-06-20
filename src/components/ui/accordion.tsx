import { ChevronDown } from "lucide-react";

export interface AccordionItem {
  question: string;
  answer: string;
}

/**
 * `<details>`-based accordion — server-rendered and crawlable with no client JS, so the Q&A
 * text is in the initial HTML (needed for the FAQ rich result to be picked up).
 */
export function Accordion({ items }: { items: AccordionItem[] }) {
  if (!items.length) return null;
  return (
    <div className="border-border divide-border divide-y rounded-2xl border">
      {items.map((it) => (
        <details key={it.question} className="group px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-medium">
            {it.question}
            <ChevronDown
              size={18}
              className="text-muted shrink-0 transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <p className="text-muted mt-2 text-sm">{it.answer}</p>
        </details>
      ))}
    </div>
  );
}
