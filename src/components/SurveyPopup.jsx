import { useEffect, useRef, useState } from "react";

export default function SurveyPopup({
  formUrl,
  delayMs = 60000,          // 60 detik
  cooldownDays = 14,         // jeda muncul lagi
  storageKey = "surveyDismissedUntil"
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef(null);

  // Cek cooldown
  useEffect(() => {
    const until = Number(localStorage.getItem(storageKey) || 0);
    const now = Date.now();
    if (now < until) return; // masih cooldown

    const t = setTimeout(() => setOpen(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs, storageKey]);

  // Tutup & set cooldown
  function closeWithCooldown() {
    const until = Date.now() + cooldownDays * 24 * 60 * 60 * 1000;
    localStorage.setItem(storageKey, String(until));
    setOpen(false);
  }

  // Tutup dengan ESC
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") closeWithCooldown(); }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Survei singkat"
      onClick={(e) => { if (e.target === e.currentTarget) closeWithCooldown(); }}
      ref={dialogRef}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 shadow-2xl ring-1 ring-white/10 overflow-hidden">
        <div className="flex items-start justify-between px-4 sm:px-6 py-4 border-b border-white/10">
          <h2 className="text-base sm:text-lg font-semibold text-white">
            Survei singkat (≤ 60 detik)
          </h2>
          <button
            onClick={closeWithCooldown}
            className="ml-3 rounded-lg px-2 py-1 text-slate-300 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-3">
          <p className="text-sm text-slate-300">
            Bantu kami meningkatkan layanan dengan menjawab survei singkat ini.
          </p>

          {/* Fallback tombol buka di tab baru */}
          <div className="flex justify-end">
            <a
              href={formUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm underline text-sky-300 hover:text-sky-200"
            >
              Buka survei di tab baru
            </a>
          </div>

          {/* Google Form embed */}
          <div className="aspect-[4/3] w-full overflow-hidden rounded-xl ring-1 ring-white/10">
            <iframe
              title="Survei Puskesmas Jagakarsa"
              src={formUrl}
              className="h-full w-full"
              loading="lazy"
              allow="clipboard-write; autoplay"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 sm:px-6 py-3 border-t border-white/10">
          <button
            onClick={closeWithCooldown}
            className="rounded-xl px-4 py-2 text-sm font-medium bg-slate-800 text-slate-100 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-white/30"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
