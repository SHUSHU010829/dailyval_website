"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";

interface HudSelectProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  required?: boolean;
  invalid?: boolean;
}

/**
 * 自訂下拉選單（取代原生 <select>）
 * - 沿用 .select-hud 的視覺樣式，但開啟後的選項清單也走 HUD 設計語言
 * - ARIA collapsible listbox pattern（aria-activedescendant + 鍵盤操作），焦點全程停留在觸發按鈕上
 */
export default function HudSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  required,
  invalid,
}: HudSelectProps) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = `${id}-listbox`;
  const optionId = (index: number) => `${id}-option-${index}`;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function openList() {
    const currentIndex = Math.max(0, options.indexOf(value));
    setHighlightedIndex(currentIndex);
    setOpen(true);
  }

  function select(option: string) {
    onChange(option);
    setOpen(false);
  }

  function onButtonKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openList();
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      select(options[highlightedIndex]);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open ? optionId(highlightedIndex) : undefined}
        aria-required={required}
        aria-invalid={invalid}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onButtonKeyDown}
        className={[
          "cut-sm flex w-full items-center justify-between border bg-bg-elevated px-4 py-3 text-left text-sm transition-colors focus:outline-none",
          invalid ? "border-val-red" : "border-border-med focus:border-val-red",
          value ? "text-text-1" : "text-text-3",
        ].join(" ")}
      >
        <span className="truncate">{value || placeholder}</span>
        <Icon
          name="CaretDown"
          size={14}
          weight="bold"
          className={`shrink-0 text-val-red transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-labelledby={id}
          className="cut-sm absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto border border-border-bright bg-bg-elevated py-1 shadow-lg"
        >
          {options.map((option, index) => (
            <li
              key={option}
              id={optionId(index)}
              role="option"
              aria-selected={value === option}
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => select(option)}
              className={[
                "cursor-pointer px-4 py-2 text-sm transition-colors",
                index === highlightedIndex ? "bg-val-red/15 text-text-1" : "text-text-2",
                value === option ? "font-bold text-text-1" : "",
              ].join(" ")}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
