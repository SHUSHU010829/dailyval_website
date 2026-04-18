"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpNumberProps {
  value: string;
  className?: string;
}

function parseTarget(value: string): { prefix: string; number: number; suffix: string } | null {
  // 移除千分位逗號後，匹配任意前綴 + 數字（含小數）+ 任意後綴
  const match = value.replace(/,/g, "").match(/^(.*?)(\d+(?:\.\d+)?)(.*)$/);
  if (!match) return null;
  return { prefix: match[1], number: parseFloat(match[2]), suffix: match[3] };
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function CountUpNumber({ value, className }: CountUpNumberProps) {
  const parsed = parseTarget(value);
  const [display, setDisplay] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  const triggered = useRef(false);

  useEffect(() => {
    if (!parsed) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || triggered.current) return;
        triggered.current = true;

        const isDecimal = parsed.number % 1 !== 0;
        const start = Math.max(0, parsed.number - parsed.number * 0.03);
        const duration = 2000;
        const startTime = performance.now();

        function tick(now: number) {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const current = start + (parsed!.number - start) * easeOut(progress);
          const formatted = isDecimal
            ? current.toFixed(1)
            : Math.round(current).toLocaleString("en-US");
          setDisplay(`${parsed!.prefix}${formatted}${parsed!.suffix}`);
          if (progress < 1) requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
