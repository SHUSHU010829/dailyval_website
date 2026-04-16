"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 戰術游標元件
 * - 延遲跟隨光點（val-red 4px dot，~120ms easing）
 * - Hitmarker：點擊 [data-cta] 元素時產生 X 形命中標記
 * - 全部包裹於 prefers-reduced-motion: no-preference
 */
export default function TacticalCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  // 尚未收到第一次 mousemove 前，光點隱藏
  const [visible, setVisible] = useState(false);
  const [hitmarkers, setHitmarkers] = useState<
    { id: number; x: number; y: number }[]
  >([]);
  const idRef = useRef(0);

  useEffect(() => {
    // 若用戶偏好減少動態效果，完全不掛載行為
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reducedMotion) return;

    const dot = dotRef.current;
    if (!dot) return;

    function onMouseMove(e: MouseEvent) {
      if (!dot) return;
      // 第一次移動才顯示光點
      if (!visible) setVisible(true);
      dot.style.left = `${e.clientX}px`;
      dot.style.top = `${e.clientY}px`;
    }

    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-cta]")) return;

      const id = ++idRef.current;
      setHitmarkers((prev) => [...prev, { id, x: e.clientX, y: e.clientY }]);

      setTimeout(() => {
        setHitmarkers((prev) => prev.filter((h) => h.id !== id));
      }, 400);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("click", onClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {/* 延遲跟隨光點：初始隱藏，收到第一次 mousemove 後顯示 */}
      <div
        ref={dotRef}
        aria-hidden="true"
        className="pointer-events-none fixed z-[9999] h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-val-red"
        style={{
          transition: "left 120ms ease-out, top 120ms ease-out",
          opacity: visible ? 0.8 : 0,
        }}
      />

      {/* Hitmarker 集合 */}
      {hitmarkers.map((h) => (
        <Hitmarker key={h.id} x={h.x} y={h.y} />
      ))}
    </>
  );
}

function Hitmarker({ x, y }: { x: number; y: number }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed z-[9998] animate-hitmarker"
      style={{
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div className="absolute h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-val-red" />
      <div className="absolute h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-val-red" />
    </div>
  );
}
