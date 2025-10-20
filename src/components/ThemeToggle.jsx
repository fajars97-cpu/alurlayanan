import { useEffect, useState } from "react";

/** Baca preferensi awal: localStorage → sistem */
function getInitial() {
  try {
    const ls = localStorage.getItem("theme");
    if (ls === "light" || ls === "dark") return ls;
  } catch {}
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Terapkan ke <html> + simpan ke localStorage */
function applyTheme(next) {
  const root = document.documentElement; // <html>
  if (next === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  try {
    localStorage.setItem("theme", next);
  } catch {}
}

export default function ThemeToggle({ className = "" }) {
  const [theme, setTheme] = useState(getInitial);

  // apply saat mount dan ketika theme berubah
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Kalau user BELUM mengatur (tidak ada localStorage), ikuti sistem secara live
  useEffect(() => {
    const ls = localStorage.getItem("theme");
    if (ls === "light" || ls === "dark") return; // user override → jangan ikut sistem

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next = mq.matches ? "dark" : "light";
      setTheme(next);        // state
      applyTheme(next);      // jaga konsistensi
    };
    // listener modern
    mq.addEventListener?.("change", onChange);
    // fallback browser lama
    mq.addListener?.(onChange);

    return () => {
      mq.removeEventListener?.("change", onChange);
      mq.removeListener?.(onChange);
    };
  }, []);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      className={
        "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors " +
        "border-black/10 bg-white text-slate-900 hover:bg-slate-100 " +
        "dark:border-white/10 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 " +
        className
      }
      aria-label="Ganti tema"
      title={isDark ? "Mode Terang" : "Mode Gelap"}
    >
      <span aria-hidden="true">{isDark ? "🌞" : "🌙"}</span>
      {isDark ? "Terang" : "Gelap"}
    </button>
  );
}
