"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

export type DropdownOption = string | { value: string; label: string };

export interface CustomDropdownProps {
  value: string;
  onChange: (val: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  inline?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Reusable Dropdown Component - Built as part of the Siding Depot design system.
 * Uses a Fixed Portal to prevent clipping in hidden/scrollable containers (e.g. tables).
 */
export function CustomDropdown({
  value,
  onChange,
  options,
  placeholder = "—",
  inline = false,
  className = "",
  style
}: CustomDropdownProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        (!menuRef.current || !menuRef.current.contains(target))
      ) {
        setOpen(false);
      }
    };
    
    // Auto-close on any scroll to prevent floating menu from detaching from the trigger
    const handleScroll = (e: Event) => {
      // Ignore if scrolling inside the menu itself
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };

    if (open) {
      document.addEventListener("mousedown", handleClick);
      window.addEventListener("scroll", handleScroll, true);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  const handleToggle = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4,
        left: inline ? rect.left + (rect.width / 2) - 70 : rect.left,
        width: inline ? 140 : Math.max(rect.width, 140)
      });
    }
    setOpen(!open);
  };

  const selectedLabel = useMemo(() => {
    const selectedOpt = options.find(o => (typeof o === 'string' ? o : o.value) === value);
    if (!selectedOpt) return value || placeholder;
    return typeof selectedOpt === 'string' ? selectedOpt : selectedOpt.label;
  }, [value, options, placeholder]);

  const menuContent = open ? (
    <div 
      ref={menuRef}
      className={`fixed z-[99999] bg-[#1a1c1a] border border-[#474846]/30 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] py-1 overflow-y-auto max-h-[300px] custom-scrollbar`}
      style={{
        top: coords.top,
        left: coords.left,
        width: coords.width,
        minWidth: inline ? 'auto' : coords.width
      }}
    >
      <button
        type="button"
        className={`w-full ${inline ? "text-center" : "text-left"} px-4 py-2.5 text-[11px] uppercase tracking-widest text-[#ababa8] hover:bg-[#aeee2a] hover:text-[#1a1c1a] font-black transition-colors`}
        onClick={() => { onChange(""); setOpen(false); }}
      >
        {placeholder}
      </button>
      {options.map(opt => {
        const optValue = typeof opt === 'string' ? opt : opt.value;
        const optLabel = typeof opt === 'string' ? opt : opt.label;
        return (
          <button
            type="button"
            key={optValue}
            className={`w-full ${inline ? "text-center" : "text-left"} px-4 py-2.5 text-xs text-[#faf9f5] hover:bg-[#aeee2a] hover:text-[#1a1c1a] font-extrabold tracking-wider transition-colors`}
            onClick={() => { onChange(optValue); setOpen(false); }}
          >
            {optLabel}
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className={className || "w-full bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm font-bold flex justify-between items-center transition-colors hover:border-[#aeee2a] text-left"}
        style={style}
      >
        <span className={`${inline ? "mx-auto" : "truncate pr-2"} font-bold text-[13px] md:text-sm`}>{selectedLabel}</span>
        {!inline && <span className="material-symbols-outlined text-[16px] text-[#ababa8] pointer-events-none shrink-0" translate="no">expand_more</span>}
      </button>
      
      {open && typeof window !== 'undefined' && createPortal(menuContent, document.body)}
    </>
  );
}
