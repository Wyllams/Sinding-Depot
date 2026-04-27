"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

// ─── Portal Email Domain ─────────────────────────────
const CUSTOMER_EMAIL_DOMAIN = "customer.sidingdepot.app";

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
    subtitle = <>Welcome to your project hub! Use your <span className="font-bold text-white">username</span> and <span className="font-bold text-white">password</span> sent to your email to access your project.</>;
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

      <h1 className="text-3xl font-black text-on-surface tracking-tight">
        {title}
      </h1>
      <p className="text-on-surface-variant text-sm mt-3 font-medium max-w-[280px]">
        {subtitle}
      </p>
    </div>
  );
}

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role") || "admin";
  const isCustomerMode = roleParam === "customer" || roleParam === "client";

  const [identifier, setIdentifier] = useState(""); // email or username
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return;
    setIsLoading(true);
    setError(null);

    try {
      // For customer mode, convert username to the derived portal email
      let emailForAuth = identifier;
      if (isCustomerMode) {
        // If user typed their username (not an email), derive the portal email
        if (!identifier.includes("@")) {
          emailForAuth = `${identifier.toLowerCase()}@${CUSTOMER_EMAIL_DOMAIN}`;
        }
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailForAuth,
        password,
      });
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
          router.push('/mobile/sales');
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
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      const msg = errObj?.message ?? "";
      if (msg.toLowerCase().includes("invalid login")) {
        setError(
          isCustomerMode
            ? "Invalid username or password. Please check the credentials sent to your email."
            : "Invalid email or password. Please try again."
        );
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
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-6" suppressHydrationWarning>

        {/* Error Banner */}
        {error && (
          <div className="flex items-start gap-3 bg-error/10 border border-error/25 rounded-xl px-4 py-3">
            <span className="material-symbols-outlined text-error shrink-0 text-[18px] mt-0.5" translate="no">error</span>
            <p className="text-xs text-error font-bold leading-relaxed">{error}</p>
          </div>
        )}

        {/* Identifier Input (Email or Username) */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 pl-1">
            {isCustomerMode ? "Username" : "Work Email"}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline-variant text-xl" translate="no">
              {isCustomerMode ? "person" : "mail"}
            </span>
            <input
              type={isCustomerMode ? "text" : "email"}
              value={identifier}
              onChange={(e) => { setIdentifier(e.target.value); setError(null); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && identifier && password) {
                  e.preventDefault();
                  handleSubmit(e as unknown as React.FormEvent);
                }
              }}
              placeholder={isCustomerMode ? "Nick_Magalhaes" : "nick@sidingdepot.com"}
              required
              autoComplete={isCustomerMode ? "username" : "email"}
              className="w-full bg-[#0a0a0a] border border-surface-container-highest rounded-xl pl-12 pr-4 py-3.5 text-sm font-bold text-on-surface placeholder-outline-variant focus:outline-none focus:border-primary/50 focus:bg-surface-container-low transition-all"
              suppressHydrationWarning
            />
          </div>
        </div>

        {/* Password Input */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              Password
            </label>
            {!isCustomerMode && (
              <Link
                href="/forgot-password"
                className="text-[10px] font-bold text-primary hover:text-white transition-colors"
                tabIndex={-1}
              >
                Forgot?
              </Link>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline-variant text-xl" translate="no">lock</span>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && identifier && password) {
                  e.preventDefault();
                  handleSubmit(e as unknown as React.FormEvent);
                }
              }}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              className="w-full bg-[#0a0a0a] border border-surface-container-highest rounded-xl pl-12 pr-12 py-3.5 text-sm font-bold text-on-surface placeholder-outline-variant focus:outline-none focus:border-primary/50 focus:bg-surface-container-low transition-all"
              suppressHydrationWarning
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant hover:text-primary transition-colors"
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
          disabled={isLoading || !identifier || !password}
          className="w-full mt-2 relative overflow-hidden group bg-primary text-surface-container-low rounded-xl py-4 font-black uppercase tracking-widest text-xs disabled:opacity-70 transition-all hover:brightness-110 active:scale-[0.98]"
        >
          <span className={`flex items-center justify-center gap-2 ${isLoading ? "opacity-0" : "opacity-100"}`}>
            {isCustomerMode ? "Access My Project" : "Sign In to Dashboard"}
            <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform" translate="no">arrow_forward</span>
          </span>
          {isLoading && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="w-5 h-5 border-2 border-surface-container-low/30 border-t-surface-container-low rounded-full animate-spin" />
            </span>
          )}
        </button>
      </form>

      {/* Portal Switch Links */}
      <div className="mt-6 text-center">
        {isCustomerMode ? (
          <p className="text-[11px] text-outline-variant">
            Are you a Siding Depot team member?{" "}
            <Link href="/login" className="text-primary font-bold hover:text-white transition-colors">
              Team Login →
            </Link>
          </p>
        ) : (
          <p className="text-[11px] text-outline-variant">
            Are you a customer?{" "}
            <Link href="/login?role=customer" className="text-primary font-bold hover:text-white transition-colors">
              Customer Portal →
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      {/* Brand Header */}
      <Suspense fallback={<div className="mb-8 flex flex-col items-center text-center"><h1 className="text-3xl font-black text-on-surface">Welcome Back</h1></div>}>
        <LoginFormHeader />
      </Suspense>

      {/* Login Form */}
      <Suspense fallback={<div className="text-center text-on-surface-variant">Loading...</div>}>
        <LoginFormContent />
      </Suspense>

      {/* Quick Access Buttons */}
      <Suspense fallback={null}>
        <QuickAccessButtons />
      </Suspense>

      <p className="text-center mt-8 text-[11px] font-bold text-outline-variant">
        Secure access for Siding Depot personnel only.
      </p>
    </div>
  );
}

// ─── Quick Access Buttons (Dev Mode) ──────────────────
function QuickAccessButtons() {
  const router = useRouter();
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

  const quickAccess = [
    { role: "admin",       label: "Admin",      icon: "shield_person",  email: "admin@sidingdepot.com",        password: "Password123!", color: "#aeee2a", redirect: "/" },
    { role: "salesperson", label: "Vendedor",    icon: "sell",           email: "salesperson@sidingdepot.com",  password: "Password123!", color: "#60a5fa", redirect: "/mobile/sales" },
    { role: "partner",     label: "Parceiro",    icon: "engineering",    email: "crew@sidingdepot.com",         password: "Password123!", color: "#f59e0b", redirect: "/field" },
    { role: "customer",    label: "Cliente",     icon: "person",         email: "wyllams_bione@customer.sidingdepot.app", password: "WyllamsB*2026", color: "#a78bfa", redirect: "/customer" },
  ];

  const handleQuickLogin = async (item: typeof quickAccess[0]) => {
    if (!item.email) {
      alert("Customer account not configured yet.");
      return;
    }

    setLoadingRole(item.role);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: item.email,
        password: item.password,
      });
      if (error) throw error;
      router.push(item.redirect);
      router.refresh();
    } catch (err: any) {
      alert("Login failed: " + err.message);
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <div className="mt-8 pt-6 border-t border-surface-container-highest">
      <p className="text-[10px] font-black uppercase tracking-widest text-outline-variant text-center mb-4">
        Quick Access
      </p>
      <div className="grid grid-cols-2 gap-3">
        {quickAccess.map((item) => (
          <button
            key={item.role}
            onClick={() => handleQuickLogin(item)}
            disabled={loadingRole !== null}
            className="relative bg-[#0a0a0a] border border-surface-container-highest rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-opacity-60 active:scale-95 transition-all disabled:opacity-50 group"
            style={{ borderColor: `${item.color}30` }}
          >
            {loadingRole === item.role ? (
              <div className="w-5 h-5 border-2 border-zinc-700 rounded-full animate-spin" style={{ borderTopColor: item.color }} />
            ) : (
              <span
                className="material-symbols-outlined text-[24px] group-hover:scale-110 transition-transform"
                translate="no"
                style={{ color: item.color }}
              >
                {item.icon}
              </span>
            )}
            <span className="text-[11px] font-bold text-white uppercase tracking-wider">
              {item.label}
            </span>
            {!item.email && (
              <span className="absolute top-2 right-2 text-[8px] font-bold text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded-full">SOON</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

