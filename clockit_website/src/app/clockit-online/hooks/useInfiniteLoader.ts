"use client";

import { useEffect, useRef } from "react";

export default function useInfiniteLoader(callback: () => void, enabled: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!enabled) {return;}
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          callback();
        }
      },
      { rootMargin: "120px" },
    );
    const node = ref.current;
    if (node) {
      observer.observe(node);
    }
    return () => {
      observer.disconnect();
    };
  }, [callback, enabled]);
  return ref;
}
