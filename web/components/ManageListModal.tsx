"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";

export interface ManageListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  items: string[];
  onAdd: (item: string) => void;
  onRemove: (item: string) => void;
  inputPlaceholder?: string;
  addLabel?: string;
  listTitle?: string;
  icon?: string; // Material symbol name, e.g. "badge", "group"
}

/**
 * Reusable modal for managing a string-based list (e.g. adding removing partners, crews, tools, filters)
 * Built as part of the Siding Depot design system.
 */
export function ManageListModal({
  isOpen,
  onClose,
  title,
  subtitle,
  items,
  onAdd,
  onRemove,
  inputPlaceholder = "Add new...",
  addLabel = "Add",
  listTitle = "Current List",
  icon = "badge"
}: ManageListModalProps) {
  const [newValue, setNewValue] = useState("");

  if (!isOpen) return null;

  const handleAdd = () => {
    const trimmed = newValue.trim().toUpperCase();
    if (trimmed) {
      onAdd(trimmed);
      setNewValue("");
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl flex flex-col max-h-[90vh] overflow-hidden" style={{ background: "#1a1c1a", border: "1px solid rgba(174,238,42,0.2)" }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#474846]/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#aeee2a]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#aeee2a] text-lg" translate="no">{icon}</span>
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[#faf9f5]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                {title}
              </h3>
              <p className="text-[10px] text-[#ababa8] uppercase tracking-widest">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#ababa8] hover:text-[#faf9f5] transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5"
          >
            <span className="material-symbols-outlined" translate="no">close</span>
          </button>
        </div>

        {/* Input Form */}
        <div className="p-6 border-b border-[#474846]/20 bg-[#1e201e]/30">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8] mb-3">{addLabel}</p>
          <div className="flex gap-2">
            <input
              autoFocus
              type="text"
              placeholder={inputPlaceholder}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
              className="flex-1 bg-[#121412] border border-[#aeee2a]/30 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#aeee2a] transition-colors placeholder:text-[#474846]"
            />
            <button
              onClick={handleAdd}
              className="px-6 py-2.5 bg-[#aeee2a] text-[#3a5400] font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all text-sm shadow-[0_0_15px_rgba(174,238,42,0.15)]"
            >
              Add
            </button>
          </div>
        </div>

        {/* Dynamic List Container */}
        <div className="p-6 max-h-[350px] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8] mb-4">
            {listTitle} ({items.length})
          </p>
          <div className="space-y-1">
            {items.map((item) => (
              <div key={item} className="flex items-center justify-between p-3 rounded-xl hover:bg-[#1e201e]/50 transition-colors group border border-transparent hover:border-[#474846]/20">
                <span className="text-sm font-bold text-[#faf9f5]">{item}</span>
                <button
                  onClick={() => onRemove(item)}
                  className="opacity-0 group-hover:opacity-100 text-[#ff7351]/80 hover:text-[#ff7351] transition-all p-1"
                  title="Remove from this list"
                >
                  <span className="material-symbols-outlined text-[20px]" translate="no">person_remove</span>
                </button>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-center text-[#ababa8] text-sm py-4">No items in this list.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof window === "undefined") return null;
  return createPortal(modalContent, document.body);
}
