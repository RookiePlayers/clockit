"use client";

import { useEffect, useState } from "react";
import { IconMoon, IconSun } from "@tabler/icons-react";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
     
    setMounted(true);
  }, []);

  const isDark = mounted ? theme === "dark" : true;

  return (
    <button
      onClick={toggle}
      aria-label="Toggle color theme"
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:border-[var(--text)]/30 transition-colors text-sm ${className}`}
      suppressHydrationWarning
    >
      {isDark ? <IconSun size={16} /> : <IconMoon size={16} />}
      <span className="hidden sm:inline">{isDark ? "Light" : "Dark"} mode</span>
    </button>
  );
}
