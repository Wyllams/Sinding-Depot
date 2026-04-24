"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

// =============================================
// Reset Password Page
// Rota: /reset-password
// Integrado ao Supabase Auth updateUser({ password })
// Design: split-screen premium (herda do layout (auth))
// =============================================

type Stage =
  | "loading"       // aguardando Supabase confirmar o token da URL
  | "form"          // exibe o formulário de nova senha
  | "success"       // senha atualizada com sucesso
  | "invalid_link"; // token inválido / expirado

const RULES = [
  { id: "length",   label: "At least 8 characters",           test: (p: string) => p.length >= 8 },
  { id: "upper",    label: "One uppercase letter",             test: (p: string) => /[A-Z]/.test(p) },
  { id: "number",   label: "One number",                      test: (p: string) => /\d/.test(p) },
  { id: "special",  label: "One special character (!@#$...)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function ResetPasswordPage() {
  const router = useRouter();

  const [stage, setStage] = useState<Stage>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showCfm, setShowCfm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Detecta o token enviado pelo Supabase na URL ──────────────
  useEffect(() => {
    // Supabase redireciona para /reset-password#access_token=...
    // O @supabase/ssr já processa o hash automaticamente.
    // Apenas precisamos verificar se há uma sessão ativa (token válido).
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setStage("form");
      } else {
        // Sem sessão = link inválido ou expirado
        setStage("invalid_link");
      }
    });
  }, []);

  // ── Validação visual das regras ───────────────────────────────
  const ruleResults = RULES.map((r) => ({ ...r, passed: r.test(password) }));
  const allRulesPassed = ruleResults.every((r) => r.passed);
  const passwordsMatch = password === confirm && confirm.length > 0;
  const canSubmit = allRulesPassed && passwordsMatch && !isLoading;

  // ── Força da senha ────────────────────────────────────────────
  const strength = ruleResults.filter((r) => r.passed).length;
  const strengthLabel = strength <= 1 ? "Weak" : strength <= 2 ? "Fair" : strength <= 3 ? "Good" : "Strong";
  const strengthColor = strength <= 1 ? "#ff7351" : strength <= 2 ? "#eedc47" : strength <= 3 ? "#60b8f5" : "#aeee2a";

  // ── Submit ────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setIsLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) throw authError;
      setStage("success");
    } catch (err: any) {
      setError(err?.message ?? "Failed to update password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // STAGE: LOADING
  // ─────────────────────────────────────────────────────────────
  if (stage === "loading") {
    return (
      <div className="w-full max-w-sm flex flex-col items-center gap-4 py-12">
        <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-on-surface-variant text-sm font-bold">Verifying your reset link...</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // STAGE: INVALID LINK
  // ─────────────────────────────────────────────────────────────
  if (stage === "invalid_link") {
    return (
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <img
            src="/logo-new.png"
            alt="Siding Depot"
            className="w-[140px] h-auto object-contain mb-6"
            style={{ filter: "drop-shadow(0px 0px 8px rgba(174,238,42,0.8)) drop-shadow(0px 0px 20px rgba(174,238,42,0.4))" }}
          />
        </div>

        <div className="text-center py-4">
          <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-outlined text-3xl text-error" translate="no">link_off</span>
          </div>
          <h2 className="text-xl font-black text-on-surface mb-2">Link Expired or Invalid</h2>
          <p className="text-on-surface-variant text-sm mb-8 leading-relaxed">
            This password reset link has expired or already been used. Request a new one to proceed.
          </p>
          <Link
            href="/forgot-password"
            className="inline-flex items-center justify-center gap-2 w-full bg-primary text-surface-container-low rounded-xl py-4 font-black uppercase tracking-widest text-xs hover:brightness-110 transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-lg" translate="no">refresh</span>
            Request New Link
          </Link>
          <Link
            href="/login"
            className="mt-4 text-[11px] font-bold text-outline-variant hover:text-on-surface transition-colors flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm" translate="no">arrow_back</span>
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // STAGE: SUCCESS
  // ─────────────────────────────────────────────────────────────
  if (stage === "success") {
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
          {/* Animated success ring */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping opacity-50" />
            <div className="relative w-20 h-20 bg-primary/15 rounded-full flex items-center justify-center border border-primary/30">
              <span className="material-symbols-outlined text-4xl text-primary" translate="no" style={{ fontVariationSettings: "'FILL' 1" }}>lock_reset</span>
            </div>
          </div>

          <h2 className="text-xl font-black text-on-surface mb-2">Password Updated!</h2>
          <p className="text-on-surface-variant text-sm mb-8 leading-relaxed">
            Your password has been successfully changed. You can now sign in with your new credentials.
          </p>

          <button
            onClick={() => router.push("/login")}
            className="inline-flex items-center justify-center gap-2 w-full bg-primary text-surface-container-low rounded-xl py-4 font-black uppercase tracking-widest text-xs hover:brightness-110 transition-all active:scale-[0.98] group"
          >
            Sign In
            <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform" translate="no">arrow_forward</span>
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // STAGE: FORM
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-sm">
      {/* Brand */}
      <div className="mb-8 flex flex-col items-center text-center">
        <img
          src="/logo-new.png"
          alt="Siding Depot"
          className="w-[140px] h-auto object-contain mb-6"
          style={{ filter: "drop-shadow(0px 0px 8px rgba(174,238,42,0.8)) drop-shadow(0px 0px 20px rgba(174,238,42,0.4))" }}
        />
        <h1 className="text-2xl font-black text-on-surface tracking-tight">Create New Password</h1>
        <p className="text-on-surface-variant text-sm mt-3 font-medium">
          Choose a strong password to protect your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Error Banner */}
        {error && (
          <div className="flex items-start gap-3 bg-error/10 border border-error/25 rounded-xl px-4 py-3">
            <span className="material-symbols-outlined text-error shrink-0 text-[18px] mt-0.5" translate="no">error</span>
            <p className="text-xs text-error font-bold leading-relaxed">{error}</p>
          </div>
        )}

        {/* New Password */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 pl-1">
            New Password
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline-variant text-xl" translate="no">lock</span>
            <input
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              required
              className="w-full bg-[#0a0a0a] border border-surface-container-highest rounded-xl pl-12 pr-12 py-3.5 text-sm font-bold text-on-surface placeholder-outline-variant focus:outline-none focus:border-primary/50 focus:bg-surface-container-low transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-lg" translate="no">{showPwd ? "visibility_off" : "visibility"}</span>
            </button>
          </div>
        </div>

        {/* Strength Meter */}
        {password.length > 0 && (
          <div className="space-y-2">
            {/* Bar */}
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex-1 h-1 rounded-full transition-all duration-300"
                  style={{ backgroundColor: i <= strength ? strengthColor : "#242624" }}
                />
              ))}
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: strengthColor }}>
              {strengthLabel}
            </p>

            {/* Rules */}
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {ruleResults.map((r) => (
                <div key={r.id} className="flex items-center gap-1.5">
                  <span
                    className="material-symbols-outlined text-[12px] shrink-0 transition-colors"
                    translate="no"
                    style={{ color: r.passed ? "#aeee2a" : "#474846", fontVariationSettings: r.passed ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {r.passed ? "check_circle" : "circle"}
                  </span>
                  <span className={`text-[10px] font-bold transition-colors ${r.passed ? "text-on-surface" : "text-outline-variant"}`}>
                    {r.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confirm Password */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 pl-1">
            Confirm Password
          </label>
          <div className="relative">
            <span
              className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-xl transition-colors"
              translate="no"
              style={{ color: confirm.length > 0 ? (passwordsMatch ? "#aeee2a" : "#ff7351") : "#474846" }}
            >
              {confirm.length > 0 ? (passwordsMatch ? "lock_open" : "lock") : "lock"}
            </span>
            <input
              type={showCfm ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              required
              className={`w-full bg-[#0a0a0a] border rounded-xl pl-12 pr-12 py-3.5 text-sm font-bold text-on-surface placeholder-outline-variant focus:outline-none transition-all ${
                confirm.length > 0
                  ? passwordsMatch
                    ? "border-primary/50 focus:border-primary"
                    : "border-error/50 focus:border-error"
                  : "border-surface-container-highest focus:border-primary/50 focus:bg-surface-container-low"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowCfm(!showCfm)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-lg" translate="no">{showCfm ? "visibility_off" : "visibility"}</span>
            </button>
          </div>
          {confirm.length > 0 && !passwordsMatch && (
            <p className="text-[10px] text-error font-bold mt-1.5 pl-1">Passwords do not match</p>
          )}
          {passwordsMatch && (
            <p className="text-[10px] text-primary font-bold mt-1.5 pl-1">✓ Passwords match</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full mt-2 relative overflow-hidden group bg-primary text-surface-container-low rounded-xl py-4 font-black uppercase tracking-widest text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:brightness-110 active:scale-[0.98]"
        >
          <span className={`flex items-center justify-center gap-2 ${isLoading ? "opacity-0" : "opacity-100"}`}>
            <span className="material-symbols-outlined text-lg" translate="no">lock_reset</span>
            Update Password
          </span>
          {isLoading && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="w-5 h-5 border-2 border-surface-container-low/30 border-t-surface-container-low rounded-full animate-spin" />
            </span>
          )}
        </button>

        <div className="text-center pt-1">
          <Link
            href="/login"
            className="text-[11px] font-bold text-outline-variant hover:text-on-surface transition-colors flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm" translate="no">arrow_back</span>
            Return to Login
          </Link>
        </div>
      </form>
    </div>
  );
}
