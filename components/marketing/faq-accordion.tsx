"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

export type FaqItem = {
  q: string;
  a: string;
};

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="mt-8 space-y-3">
      {items.map((item, index) => {
        const expanded = openIndex === index;
        const buttonId = `faq-trigger-${index}`;
        const panelId = `faq-panel-${index}`;

        return (
          <div
            key={item.q}
            className={`overflow-hidden rounded-2xl border bg-white transition-[border-color,box-shadow] duration-300 ${
              expanded
                ? "border-line-strong shadow-[var(--shadow-card)]"
                : "border-line hover:border-line-strong"
            }`}
          >
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpenIndex(expanded ? -1 : index)}
                className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-6"
              >
                <span className="font-display text-lg font-semibold">
                  {item.q}
                </span>
                <span
                  aria-hidden
                  className={`grid size-8 shrink-0 place-items-center rounded-full border transition-colors duration-300 ${
                    expanded
                      ? "border-primary/30 bg-primary-ink text-primary-deep"
                      : "border-line text-ink-mute"
                  }`}
                >
                  {expanded ? (
                    <Minus className="size-4" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              aria-hidden={!expanded}
              className="grid transition-[grid-template-rows] duration-300 ease-out"
              style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-[15px] leading-relaxed text-ink-soft sm:px-6">
                  {item.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
