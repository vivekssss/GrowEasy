import React from "react";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

export default function ThemeToggle({ theme, toggleTheme }: ThemeToggleProps) {
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-slate-200 dark:bg-slate-800 transition-colors duration-300 ease-in-out focus:outline-none"
      aria-label="Toggle dark mode"
    >
      <span
        className={`pointer-events-none flex h-6 w-6 transform items-center justify-center rounded-full bg-white dark:bg-slate-950 shadow-md ring-0 transition duration-300 ease-in-out ${
          isDark ? "translate-x-7" : "translate-x-0"
        }`}
      >
        {isDark ? (
          <Moon className="h-3.5 w-3.5 text-indigo-400 fill-indigo-400/10" />
        ) : (
          <Sun className="h-3.5 w-3.5 text-amber-500 fill-amber-500/10" />
        )}
      </span>
      <Sun className={`absolute left-1.5 top-1.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500 transition-opacity duration-300 ${isDark ? "opacity-100" : "opacity-0 pointer-events-none"}`} />
      <Moon className={`absolute right-1.5 top-1.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500 transition-opacity duration-300 ${isDark ? "opacity-0 pointer-events-none" : "opacity-100"}`} />
    </button>
  );
}
