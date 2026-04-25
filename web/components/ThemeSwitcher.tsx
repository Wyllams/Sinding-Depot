"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by waiting until mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9 sm:w-10 sm:h-10"></div>; // Placeholder
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full text-on-surface-variant bg-transparent hover:bg-white/5 transition-all"
      title="Toggle Dark/Light Mode"
    >
      <span className="material-symbols-outlined text-[18px] sm:text-[22px]" translate="no">
        {theme === "dark" ? "light_mode" : "dark_mode"}
      </span>
    </button>
  );
}
