"use client";

import * as React from "react";

type InViewOptions = {
  once?: boolean;
  threshold?: number;
  rootMargin?: string;
};

/**
 * Small, dependency-free viewport observer used by the marketing page.
 * Content is always present in the DOM; only its visual treatment changes.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>({
  once = true,
  threshold = 0.15,
  rootMargin = "0px 0px -10% 0px",
}: InViewOptions = {}) {
  const ref = React.useRef<T | null>(null);
  const [inView, setInView] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      const frame = window.requestAnimationFrame(() => setInView(true));
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once, threshold, rootMargin]);

  return { ref, inView };
}

type RevealProps = {
  as?: "div" | "li" | "section" | "article" | "span";
  children: React.ReactNode;
  className?: string;
  delay?: number;
  once?: boolean;
  threshold?: number;
  rootMargin?: string;
};

/**
 * Fades and lifts content into place the first time it enters the viewport.
 * `once={false}` is used for the sample proposal so it can replay on re-entry.
 */
export function Reveal({
  as: Tag = "div",
  children,
  className,
  delay = 0,
  once = true,
  threshold,
  rootMargin,
}: RevealProps) {
  const { ref, inView } = useInView<HTMLElement>({
    once,
    threshold,
    rootMargin,
  });

  return React.createElement(
    Tag,
    {
      ref,
      className,
      "data-reveal": inView ? "in" : "out",
      style: { "--reveal-delay": `${delay}ms` } as React.CSSProperties,
    },
    children,
  );
}
