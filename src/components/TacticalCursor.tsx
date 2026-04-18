"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 戰術準心游標
 * - 4 條準心臂 + 中心點，完全取代原生游標
 * - hover 可點擊元素：臂向內收縮、變紅（瞄準感）
 * - 點擊任意處：hitmarker X 形命中標記
 * - prefers-reduced-motion：自動降級，不掛載
 */
export default function TacticalCursor() {
  const reticleRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [hitmarkers, setHitmarkers] = useState<{ id: number; x: number; y: number }[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const reticle = reticleRef.current;
    if (!reticle) return;

    function onMouseMove(e: MouseEvent) {
      if (!reticle) return;
      if (!visible) setVisible(true);
      reticle.style.left = `${e.clientX}px`;
      reticle.style.top = `${e.clientY}px`;
    }

    function isInteractive(target: EventTarget | null) {
      if (!target) return false;
      return !!(target as HTMLElement).closest(
        "a, button, [data-cta], [role='button'], input, select, textarea, label"
      );
    }

    function onMouseOver(e: MouseEvent) {
      if (isInteractive(e.target)) setHovering(true);
    }

    function onMouseOut(e: MouseEvent) {
      if (isInteractive(e.target)) setHovering(false);
    }

    function onClick(e: MouseEvent) {
      const id = ++idRef.current;
      setHitmarkers((prev) => [...prev, { id, x: e.clientX, y: e.clientY }]);
      setTimeout(() => {
        setHitmarkers((prev) => prev.filter((h) => h.id !== id));
      }, 500);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseover", onMouseOver);
    document.addEventListener("mouseout", onMouseOut);
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("click", onClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div
        ref={reticleRef}
        aria-hidden="true"
        className="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-1/2"
        style={{ opacity: visible ? 1 : 0 }}
      >
        <Crosshair hovering={hovering} />
      </div>

      {hitmarkers.map((h) => (
        <Hitmarker key={h.id} x={h.x} y={h.y} />
      ))}
    </>
  );
}

function Crosshair({ hovering }: { hovering: boolean }) {
  const gap = hovering ? 1 : 5;
  const length = hovering ? 5 : 7;
  const thickness = 2;
  const color = hovering ? "#ff4655" : "rgba(255,255,255,0.85)";
  const transition = "all 120ms ease-out";
  const boxSize = (gap + length) * 2 + thickness;

  const armBase: React.CSSProperties = {
    position: "absolute",
    backgroundColor: color,
    left: "50%",
    top: "50%",
    transition,
  };

  return (
    <div style={{ position: "relative", width: boxSize, height: boxSize }}>
      {/* 中心點 */}
      <div
        style={{
          ...armBase,
          width: thickness,
          height: thickness,
          borderRadius: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />
      {/* 上臂 */}
      <div
        style={{
          ...armBase,
          width: thickness,
          height: length,
          transform: `translate(-50%, calc(-100% - ${gap}px))`,
        }}
      />
      {/* 下臂 */}
      <div
        style={{
          ...armBase,
          width: thickness,
          height: length,
          transform: `translate(-50%, ${gap}px)`,
        }}
      />
      {/* 左臂 */}
      <div
        style={{
          ...armBase,
          width: length,
          height: thickness,
          transform: `translate(calc(-100% - ${gap}px), -50%)`,
        }}
      />
      {/* 右臂 */}
      <div
        style={{
          ...armBase,
          width: length,
          height: thickness,
          transform: `translate(${gap}px, -50%)`,
        }}
      />
    </div>
  );
}

function Hitmarker({ x, y }: { x: number; y: number }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed z-[9998] animate-hitmarker"
      style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}
    >
      <div className="absolute h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-val-red" />
      <div className="absolute h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-val-red" />
    </div>
  );
}
