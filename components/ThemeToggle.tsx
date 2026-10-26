"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "./icons";

type Theme = "light" | "dark";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("vo:theme", next);
    } catch {
      /* preference just won't persist */
    }
    setTheme(next);
  }

  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={theme === null}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Dark theme (Cinematic Spark) on. Switch to light." : "Light theme (Solar Glow) on. Switch to dark."}
      title={isDark ? "Cinematic Spark (dark)" : "Solar Glow (light)"}
      className="btn btn-ghost h-10 w-10 !p-0"
    >
      {isDark ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
