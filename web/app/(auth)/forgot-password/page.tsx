"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (authError) throw authError;
      setIsSubmitted(true);
    } catch (err: any) {
      // Por segurança, Supabase não confirma se o email existe.
      // Mostramos sucesso de qualquer forma para não vazar info.
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

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

        <h1 className="text-2xl font-black text-[#faf9f5] tracking-tight">
          Reset Password
        </h1>
        <p className="text-[#ababa8] text-sm mt-3 font-medium">
          Enter your email to receive recovery instructions.
        </p>
      </div>

      {/* Recovery Form */}
      <div className="w-full">
        {isSubmitted ? (
          <div className="text-center py-4">
            {/* Animated checkmark */}
            <div className="relative w-16 h-16 mx-auto mb-5">
              <div className="absolute inset-0 rounded-full bg-[#aeee2a]/10 animate-ping opacity-40" />
              <div className="relative w-16 h-16 bg-[#aeee2a]/15 rounded-full flex items-center justify-center border border-[#aeee2a]/25">
                <span className="material-symbols-outlined text-3xl text-[#aeee2a]" translate="no" style={{ fontVariationSettings: "'FILL' 1" }}>mark_email_read</span>
              </div>
            </div>

            <h3 className="text-lg font-black text-[#faf9f5] mb-2">Check your Email</h3>
            <p className="text-[#ababa8] text-sm mb-2 leading-relaxed">
              If <span className="font-bold text-white">{email}</span> is registered, you'll receive password reset instructions shortly.
            </p>
            <p className="text-[#474846] text-xs mb-8">
              Don't forget to check your spam folder.
            </p>

            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 w-full bg-[#aeee2a] text-[#121412] rounded-xl py-4 font-black uppercase tracking-widest text-xs hover:brightness-110 transition-all active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-lg" translate="no">arrow_back</span>
              Back to Login
            </Link>

            <button
              onClick={() => { setIsSubmitted(false); setEmail(""); }}
              className="mt-4 text-[11px] font-bold text-[#474846] hover:text-[#faf9f5] transition-colors flex items-center justify-center gap-1.5 w-full"
            >
              <span className="material-symbols-outlined text-sm" translate="no">refresh</span>
              Try a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Error Banner */}
            {error && (
              <div className="flex items-start gap-3 bg-[#ff7351]/10 border border-[#ff7351]/25 rounded-xl px-4 py-3">
                <span className="material-symbols-outlined text-[#ff7351] shrink-0 text-[18px] mt-0.5" translate="no">error</span>
                <p className="text-xs text-[#ff7351] font-bold leading-relaxed">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#ababa8] mb-2 pl-1">
                Work Email
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#474846] text-xl" translate="no">mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && email) {
                      e.preventDefault();
                      handleSubmit(e as any);
                    }
                  }}
                  placeholder="nick@sidingdepot.com"
                  required
                  autoComplete="email"
                  className="w-full bg-[#0a0a0a] border border-[#242624] rounded-xl pl-12 pr-4 py-3.5 text-sm font-bold text-[#faf9f5] placeholder-[#474846] focus:outline-none focus:border-[#aeee2a]/50 focus:bg-[#121412] transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full relative overflow-hidden group bg-[#aeee2a] text-[#121412] rounded-xl py-4 font-black uppercase tracking-widest text-xs disabled:opacity-70 transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <span className={`flex items-center justify-center gap-2 ${isLoading ? "opacity-0" : "opacity-100"}`}>
                Send Instructions
                <span className="material-symbols-outlined text-lg" translate="no">send</span>
              </span>
              {isLoading && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="w-5 h-5 border-2 border-[#121412]/30 border-t-[#121412] rounded-full animate-spin" />
                </span>
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="text-[11px] font-bold text-[#474846] hover:text-[#faf9f5] transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm" translate="no">arrow_back</span>
                Return to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
