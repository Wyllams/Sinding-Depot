"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export interface CustomDropdownProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  inline?: boolean;
  className?: string;
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
  className = ""
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
        width: inline ? 140 : rect.width
      });
    }
    setOpen(!open);
  };

  const menuContent = open ? (
    <div 
      ref={menuRef}
      className="fixed z-[99999] bg-[#1a1c1a] border border-[#474846]/30 rounded-xl shadow-2xl py-1 overflow-hidden"
      style={{
        top: coords.top,
        left: coords.left,
        width: coords.width,
      }}
    >
      <button
        type="button"
        className={`w-full ${inline ? "text-center" : "text-left"} px-4 py-2.5 text-[11px] uppercase tracking-widest text-[#ababa8] hover:bg-[#aeee2a] hover:text-[#1a1c1a] font-black transition-colors`}
        onClick={() => { onChange(""); setOpen(false); }}
      >
        {placeholder}
      </button>
      {options.map(s => (
        <button
          type="button"
          key={s}
          className={`w-full ${inline ? "text-center" : "text-left"} px-4 py-2.5 text-xs text-[#faf9f5] hover:bg-[#aeee2a] hover:text-[#1a1c1a] font-extrabold tracking-wider transition-colors`}
          onClick={() => { onChange(s); setOpen(false); }}
        >
          {s}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className={className || "w-full bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm font-bold flex justify-between items-center transition-colors hover:border-[#aeee2a]"}
      >
        <span className={inline ? "mx-auto" : ""}>{value || placeholder}</span>
        {!inline && <span className="material-symbols-outlined text-[16px] text-[#ababa8] pointer-events-none" translate="no">expand_more</span>}
      </button>
      
      {open && typeof window !== 'undefined' && createPortal(menuContent, document.body)}
    </>
  );
}
