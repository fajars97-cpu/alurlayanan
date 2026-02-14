// src/config/scheduleOverride.js

// Toggle utama (tinggal flip true/false)
export const RAMADAN_MODE = true;

// Default Ramadan: Senin–Jumat 08:00–15:00
export const RAMADAN_DEFAULT = {
  Senin: "08:00-15:00",
  Selasa: "08:00-15:00",
  Rabu: "08:00-15:00",
  Kamis: "08:00-15:00",
  Jumat: "08:00-15:00",
  Sabtu: "Tutup",
  Minggu: "Tutup",
};

// Libur massal: 16–17 Feb 2026
export const GLOBAL_CLOSED_DATES = new Set(["2026-02-16", "2026-02-17"]);

// Poli yang tetap buka 24 jam (ID sudah cocok dengan core.js kamu)
export const ALWAYS_OPEN_POLI_IDS = new Set(["igd", "farmasi", "pelayanan-24", "pendaftaran_online", "RB"]);

export function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
