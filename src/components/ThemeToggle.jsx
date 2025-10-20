import { useEffect, useState } from "react";

function getInitialTheme() {
  const ls = localStorage.getItem("theme");
  if (ls === "light" || ls === "dark") return ls;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeToggle({ className = "" }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      className={
        "inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm " +
        "bg-white/5 hover:bg-white/10 dark:bg-slate-800/60 dark:hover:bg-slate-800 " +
        "text-slate-800 dark:text-slate-100 " + className
      }
      aria-label="Ganti tema"
      title={isDark ? "Mode Terang" : "Mode Gelap"}
    >
      <span aria-hidden="true">{isDark ? "🌞" : "🌙"}</span>
      {isDark ? "Terang" : "Gelap"}
    </button>
  );
}

useEffect(() => {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => {
    const ls = localStorage.getItem("theme");
    if (!ls) setTheme(mq.matches ? "dark" : "light");
  };
  mq.addEventListener?.("change", handler);
  return () => mq.removeEventListener?.("change", handler);
}, []);