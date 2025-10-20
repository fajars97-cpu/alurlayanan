export default function ThemeToggle({ className = "" }) {
  function toggle() {
    const root = document.documentElement;
    const nextIsDark = !root.classList.contains("dark");
    root.classList.toggle("dark", nextIsDark);
    try {
      localStorage.setItem("theme", nextIsDark ? "dark" : "light");
    } catch {}
  }

  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

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
