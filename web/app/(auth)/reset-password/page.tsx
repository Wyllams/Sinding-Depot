"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// =============================================
// Reset Password — Disabled
// Self-service password resets are disabled.
// Only admins can reset passwords via the admin panel.
// This page redirects to /login if someone follows an old reset link.
// =============================================

export default function ResetPasswordPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login after a brief delay so the message is visible
    const timer = setTimeout(() => {
      router.push("/login");
    }, 4000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center text-center">
        <img
          src="/logo-new.png"
          alt="Siding Depot"
          className="w-[140px] h-auto object-contain mb-6"
          style={{ filter: "drop-shadow(0px 0px 8px rgba(174,238,42,0.8)) drop-shadow(0px 0px 20px rgba(174,238,42,0.4))" }}
        />
      </div>

      <div className="text-center py-4">
        <div className="w-16 h-16 bg-[#f5a623]/10 rounded-full flex items-center justify-center mx-auto mb-5">
          <span className="material-symbols-outlined text-3xl text-[#f5a623]" translate="no">warning</span>
        </div>
        <h2 className="text-xl font-black text-on-surface mb-2">Feature Disabled</h2>
        <p className="text-on-surface-variant text-sm mb-4 leading-relaxed">
          Self-service password resets are no longer available. Please contact your administrator.
        </p>
        <p className="text-outline-variant text-xs mb-6">
          Redirecting to login...
        </p>

        {/* Spinner */}
        <div className="flex justify-center mb-6">
          <span className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    </div>
  );
}
