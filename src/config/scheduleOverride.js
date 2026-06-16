// src/config/scheduleOverride.js

// Toggle utama (tinggal flip true/false).
export const RAMADAN_MODE = true;

// Default Ramadan: Senin-Jumat 08:00-15:00.
export const RAMADAN_DEFAULT = {
  Senin: "08:00-15:00",
  Selasa: "08:00-15:00",
  Rabu: "08:00-15:00",
  Kamis: "08:00-15:00",
  Jumat: "08:00-15:00",
  Sabtu: "Tutup",
  Minggu: "Tutup",
};

// Libur nasional dan cuti bersama 2026.
// Sumber: SKB 3 Menteri Nomor 1497/2025, 2/2025, dan 5/2025.
const NATIONAL_HOLIDAYS_2026 = {
  "2026-01-01": "Tahun Baru 2026 Masehi",
  "2026-01-16": "Isra Mikraj Nabi Muhammad saw.",
  "2026-02-17": "Tahun Baru Imlek 2577 Kongzili",
  "2026-03-19": "Hari Suci Nyepi Tahun Baru Saka 1948",
  "2026-03-21": "Hari Raya Idulfitri 1447 H",
  "2026-03-22": "Hari Raya Idulfitri 1447 H",
  "2026-04-03": "Wafat Yesus Kristus",
  "2026-04-05": "Kebangkitan Yesus Kristus (Paskah)",
  "2026-05-01": "Hari Buruh Internasional",
  "2026-05-14": "Kenaikan Yesus Kristus",
  "2026-05-27": "Hari Raya Iduladha 1447 H",
  "2026-05-31": "Hari Raya Waisak 2570 BE",
  "2026-06-01": "Hari Lahir Pancasila",
  "2026-06-16": "1 Muharam Tahun Baru Islam 1448 H",
  "2026-08-17": "Proklamasi Kemerdekaan",
  "2026-08-25": "Maulid Nabi Muhammad saw.",
  "2026-12-25": "Kelahiran Yesus Kristus",
};

const COLLECTIVE_LEAVE_2026 = {
  "2026-02-16": "Cuti bersama Tahun Baru Imlek 2577 Kongzili",
  "2026-03-18": "Cuti bersama Hari Suci Nyepi Tahun Baru Saka 1948",
  "2026-03-20": "Cuti bersama Hari Raya Idulfitri 1447 H",
  "2026-03-23": "Cuti bersama Hari Raya Idulfitri 1447 H",
  "2026-03-24": "Cuti bersama Hari Raya Idulfitri 1447 H",
  "2026-05-15": "Cuti bersama Kenaikan Yesus Kristus",
  "2026-05-28": "Cuti bersama Hari Raya Iduladha 1447 H",
  "2026-12-24": "Cuti bersama Kelahiran Yesus Kristus",
};

export const HOLIDAY_DATES = {
  ...NATIONAL_HOLIDAYS_2026,
  ...COLLECTIVE_LEAVE_2026,
};

export const GLOBAL_CLOSED_DATES = new Set(Object.keys(HOLIDAY_DATES));

// Poli yang tetap buka saat libur nasional/cuti bersama.
// ID ini mengikuti data di src/data/services/core.js.
export const ALWAYS_OPEN_POLI_IDS = new Set([
  "igd",
  "pelayanan-24",
  "farmasi",
  "RB",
  "pendaftaran_online",
]);

export function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
