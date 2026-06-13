import { useEffect, useState } from "react";

function getCurrentTheme() {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export default function ThemeToggle({ className = "" }) {
  const [theme, setTheme] = useState(getCurrentTheme);
  const isDark = theme === "dark";

  function applyTheme(nextTheme) {
    const nextIsDark = nextTheme === "dark";
    document.documentElement.classList.toggle("dark", nextIsDark);

    try {
      localStorage.setItem("theme", nextTheme);
    } catch {
      // Ignore storage failures in private or locked-down browsers.
    }

    setTheme(nextTheme);
  }

  function toggle() {
    applyTheme(isDark ? "light" : "dark");
  }

  useEffect(() => {
    setTheme(getCurrentTheme());

    const onStorage = (event) => {
      if (event.key === "theme") setTheme(getCurrentTheme());
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      className={
        "inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors " +
        "border-black/10 bg-white text-slate-800 hover:bg-slate-50 " +
        "dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 " +
        className
      }
      aria-label={isDark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
      aria-pressed={isDark}
      title={isDark ? "Mode Terang" : "Mode Gelap"}
    >
      <span aria-hidden="true" className="grid size-5 place-items-center">
        {isDark ? (
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              d="M12 4V2m0 20v-2m8-8h2M2 12h2m14.95-6.95 1.41-1.41M3.64 20.36l1.41-1.41m0-13.9L3.64 3.64m16.72 16.72-1.41-1.41M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 7 7 0 1 0 20.5 15.5z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className="hidden sm:inline">{isDark ? "Terang" : "Gelap"}</span>
    </button>
  );
}
