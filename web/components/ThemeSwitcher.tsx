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
    return <div className="w-10 h-6"></div>; // Placeholder
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex items-center gap-3 p-2 rounded-xl transition-colors hover:bg-surface-container-high"
      title="Toggle Dark/Light Mode"
    >
      <span className="material-symbols-outlined text-on-surface-variant" translate="no">
        {theme === "dark" ? "light_mode" : "dark_mode"}
      </span>
      <span className="text-on-surface font-bold text-sm hidden md:inline">
        {theme === "dark" ? "Light Mode" : "Dark Mode"}
      </span>
    </button>
  );
}
