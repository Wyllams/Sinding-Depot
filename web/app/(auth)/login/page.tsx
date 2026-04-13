"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Mock login delay
    setTimeout(() => {
      document.cookie = "siding_session=1; path=/; max-age=86400";
      router.push("/");
    }, 1000);
  };

  return (
    <div className="w-full max-w-sm">
      {/* Brand Header */}
      <div className="mb-8 flex flex-col items-center text-center">
        {/* Brand Logo Renderizado */}
        <div className="flex flex-col items-center justify-center mb-6">
          <img 
            src="/logo-new.png" 
            alt="Siding Depot Logo" 
            className="w-[150px] h-auto object-contain" 
            style={{ filter: "drop-shadow(0px 0px 8px rgba(174, 238, 42, 0.8)) drop-shadow(0px 0px 20px rgba(174, 238, 42, 0.4))" }}
          />
        </div>

        <h1 className="text-3xl font-black text-[#faf9f5] tracking-tight">
          Welcome Back
        </h1>
        <p className="text-[#ababa8] text-sm mt-3 font-medium">
          Command Center Access for <span className="font-bold text-white">Siding Depot</span> personnel.
        </p>
      </div>

      {/* Login Form */}
      <div className="w-full">
        <form onSubmit={handleSubmit} className="space-y-6">
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
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && email && password) {
                    e.preventDefault();
                    handleSubmit(e as any);
                  }
                }}
                placeholder="nick@sidingdepot.com"
                required
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
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && email && password) {
                    e.preventDefault();
                    handleSubmit(e as any);
                  }
                }}
                placeholder="Enter your password"
                required
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
            disabled={isLoading}
            className="w-full mt-2 relative overflow-hidden group bg-[#aeee2a] text-[#121412] rounded-xl py-4 font-black uppercase tracking-widest text-xs disabled:opacity-70 transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <span className={`flex items-center justify-center gap-2 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
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
