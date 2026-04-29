"use client";

import Link from "next/link";

// =============================================
// Forgot Password — Restricted
// Only admins can reset passwords. Users must
// contact their administrator to reset access.
// =============================================

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-sm">
      {/* Brand Header */}
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="flex flex-col items-center justify-center mb-6">
          <img
            src="/logo-new.png"
            alt="Siding Depot Logo"
            className="w-[150px] h-auto object-contain"
            style={{ filter: "drop-shadow(0px 0px 8px rgba(174, 238, 42, 0.8)) drop-shadow(0px 0px 20px rgba(174, 238, 42, 0.4))" }}
          />
        </div>

        <h1 className="text-2xl font-black text-on-surface tracking-tight">
          Password Reset
        </h1>
        <p className="text-on-surface-variant text-sm mt-3 font-medium">
          Password resets are managed by administrators.
        </p>
      </div>

      {/* Contact Admin Message */}
      <div className="text-center py-4">
        {/* Info Icon */}
        <div className="relative w-16 h-16 mx-auto mb-5">
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse opacity-40" />
          <div className="relative w-16 h-16 bg-primary/15 rounded-full flex items-center justify-center border border-primary/25">
            <span className="material-symbols-outlined text-3xl text-primary" translate="no" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
          </div>
        </div>

        <h3 className="text-lg font-black text-on-surface mb-3">Contact Your Admin</h3>
        <p className="text-on-surface-variant text-sm mb-2 leading-relaxed">
          For security, password resets can only be performed by a{" "}
          <span className="font-bold text-white">system administrator</span>.
        </p>
        <p className="text-on-surface-variant text-sm mb-6 leading-relaxed">
          Please contact <span className="font-bold text-primary">Nick</span> or your team lead to request a password reset.
        </p>

        {/* Contact info box */}
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-center gap-2 text-on-surface-variant text-xs font-bold">
            <span className="material-symbols-outlined text-lg text-primary" translate="no">shield_person</span>
            Admin-only password reset policy
          </div>
        </div>

        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 w-full bg-primary text-surface-container-low rounded-xl py-4 font-black uppercase tracking-widest text-xs hover:brightness-110 transition-all active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-lg" translate="no">arrow_back</span>
          Back to Login
        </Link>
      </div>
    </div>
  );
}
