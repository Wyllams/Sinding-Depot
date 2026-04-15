"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

function LoginFormHeader() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") || "admin";

  let title = "Welcome Back";
  let subtitle = <>Command Center Access for <span className="font-bold text-white">Siding Depot</span> personnel.</>;

  if (role === "sales") {
    title = "Siding Depot Sales";
    subtitle = <>Welcome back! Ready to crush your quotas and close some great deals today? Let's go!</>;
  } else if (role === "crew" || role === "partner") {
    title = "Partner Portal";
    subtitle = <>Welcome! Thank you for your hard work and partnership. Let's execute another perfect job today.</>;
  } else if (role === "customer" || role === "client") {
    title = "Customer Portal";
    subtitle = <>Welcome to your project hub! We are fully committed to bringing your vision to life with the highest quality.</>;
  }

  return (
    <div className="mb-8 flex flex-col items-center text-center">
      <div className="flex flex-col items-center justify-center mb-6">
        <img
          src="/logo-new.png"
          alt="Siding Depot Logo"
          className="w-[150px] h-auto object-contain"
          style={{ filter: "drop-shadow(0px 0px 8px rgba(174, 238, 42, 0.8)) drop-shadow(0px 0px 20px rgba(174, 238, 42, 0.4))" }}
        />
      </div>

      <h1 className="text-3xl font-black text-[#faf9f5] tracking-tight">
        {title}
      </h1>
      <p className="text-[#ababa8] text-sm mt-3 font-medium max-w-[280px]">
        {subtitle}
      </p>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      if (authData?.user) {
        // Fetch role to determine redirection
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .single();

        const role = profile?.role || 'admin';

        if (role === 'salesperson') {
          router.push('/sales');
        } else if (role === 'partner' || role === 'crew') {
          router.push('/field');
        } else if (role === 'customer' || role === 'client') {
          router.push('/customer');
        } else {
          router.push('/');
        }
      } else {
        router.push('/');
      }
      
      router.refresh();
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg.toLowerCase().includes("invalid login")) {
        setError("Invalid email or password. Please try again.");
      } else if (msg.toLowerCase().includes("email not confirmed")) {
        setError("Please confirm your email address before signing in.");
      } else {
        setError(msg || "An error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      {/* Brand Header */}
      <Suspense fallback={<div className="mb-8 flex flex-col items-center text-center"><h1 className="text-3xl font-black text-[#faf9f5]">Welcome Back</h1></div>}>
        <LoginFormHeader />
      </Suspense>

      {/* Login Form */}
      <div className="w-full">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Error Banner */}
          {error && (
            <div className="flex items-start gap-3 bg-[#ff7351]/10 border border-[#ff7351]/25 rounded-xl px-4 py-3">
              <span className="material-symbols-outlined text-[#ff7351] shrink-0 text-[18px] mt-0.5" translate="no">error</span>
              <p className="text-xs text-[#ff7351] font-bold leading-relaxed">{error}</p>
            </div>
          )}

          {/* Email Input */}
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
                  if (e.key === "Enter" && email && password) {
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

          {/* Password Input */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#ababa8]">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-[10px] font-bold text-[#aeee2a] hover:text-white transition-colors"
                tabIndex={-1}
              >
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#474846] text-xl" translate="no">lock</span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && email && password) {
                    e.preventDefault();
                    handleSubmit(e as any);
                  }
                }}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                className="w-full bg-[#0a0a0a] border border-[#242624] rounded-xl pl-12 pr-12 py-3.5 text-sm font-bold text-[#faf9f5] placeholder-[#474846] focus:outline-none focus:border-[#aeee2a]/50 focus:bg-[#121412] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#474846] hover:text-[#aeee2a] transition-colors"
              >
                <span className="material-symbols-outlined text-lg" translate="no">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className="w-full mt-2 relative overflow-hidden group bg-[#aeee2a] text-[#121412] rounded-xl py-4 font-black uppercase tracking-widest text-xs disabled:opacity-70 transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <span className={`flex items-center justify-center gap-2 ${isLoading ? "opacity-0" : "opacity-100"}`}>
              Sign In to Dashboard
              <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform" translate="no">arrow_forward</span>
            </span>
            {isLoading && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-5 h-5 border-2 border-[#121412]/30 border-t-[#121412] rounded-full animate-spin" />
              </span>
            )}
          </button>
        </form>
      </div>

      <p className="text-center mt-8 text-[11px] font-bold text-[#474846]">
        Secure access for Siding Depot personnel only.
      </p>
    </div>
  );
}
