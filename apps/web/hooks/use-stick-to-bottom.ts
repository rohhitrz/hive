"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const THRESHOLD_PX = 40;

/** Auto-scrolls to the bottom when `dep` changes, unless the user has scrolled up. */
export function useStickToBottom<T extends HTMLElement>(dep: unknown) {
  const ref = useRef<T>(null);
  const [stuck, setStuck] = useState(true);

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setStuck(el.scrollHeight - el.scrollTop - el.clientHeight < THRESHOLD_PX);
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
    setStuck(true);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (el && stuck) el.scrollTop = el.scrollHeight;
  }, [dep, stuck]);

  return { ref, onScroll, stuck, scrollToBottom };
}
