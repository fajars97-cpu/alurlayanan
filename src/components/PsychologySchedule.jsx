// src/components/PsychologySchedule.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gaEvent } from "../ga.js"; // opsional, bisa dihapus kalau tidak ingin GA

// TODO: ganti dengan URL Apps Script kamu
const API_URL =
  "https://script.google.com/macros/s/AKfycbyF7jT9rPHMnGvvX8WIBZOfHNhBrE0K0Lod-XY9DsteiiMnQm0duJJfCkPbKGLyuIhv/exec";

// Konstanta tanggal
const DAY_NAMES_SHORT = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const DAY_NAMES_FULL = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];
const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function startOfDay(d) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}
function addDays(d, n) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}
function toIsoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function formatLongDateId(d) {
  const dayName = DAY_NAMES_FULL[d.getDay()];
  const date = String(d.getDate()).padStart(2, "0");
  const monthName = MONTH_NAMES_ID[d.getMonth()];
  const year = d.getFullYear();
  return `${dayName}, ${date} ${monthName} ${year}`;
}

function getDaysInMonth(year, month) {
  // month: 0–11
  return new Date(year, month + 1, 0).getDate();
}

// Ambil class indikator dot berdasarkan ringkasan hari
function getDotClass({ disabled, dayData }) {
  if (disabled) {
    // tanggal tidak bisa dipilih → putih / abu
    return "bg-slate-300 dark:bg-slate-600";
  }
  if (!dayData) {
    // tidak ada data → treat libur
    return "bg-slate-200 dark:bg-slate-700";
  }

  const summary = dayData.summary || {};
  const available = summary.tersedia ?? 0;
  const totalSessions = Object.values(summary).reduce(
    (sum, v) => sum + (typeof v === "number" ? v : 0),
    0
  );

  // Tidak ada sesi sama sekali atau semua "tidak_tersedia" → libur
  if (totalSessions === 0 || (available === 0 && summary.tidak_tersedia > 0)) {
    return "bg-slate-200 dark:bg-slate-700";
  }

  // Tidak ada sesi tersedia → penuh
  if (available === 0) {
    return "bg-red-500";
  }

  // 4–5 sesi tersedia → banyak sesi (hijau)
  if (available >= 4) {
    return "bg-emerald-500";
  }

  // 1–3 sesi tersedia → tersisa sedikit (kuning)
  return "bg-amber-400";
}

function statusPillClass(status) {
  switch (status) {
    case "tersedia":
      return "bg-emerald-100 text-emerald-800 border-emerald-300";
    case "konfirmasi":
      return "bg-amber-100 text-amber-800 border-amber-300";
    case "terisi":
      return "bg-red-100 text-red-800 border-red-300";
    case "tidak_tersedia":
    default:
      return "bg-slate-100 text-slate-700 border-slate-300";
  }
}

function prettyStatus(status) {
  if (!status) return "-";
  switch (status) {
    case "tersedia":
      return "Tersedia";
    case "konfirmasi":
      return "Menunggu Konfirmasi";
    case "terisi":
      return "Sudah Terisi";
    case "tidak_tersedia":
      return "Tidak Tersedia";
    default:
      return status;
  }
}

export default function PsychologySchedule() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const maxDate = useMemo(() => startOfDay(addDays(today, 30)), [today]);

  // State bulan yang sedang dilihat (kalender)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [daysByDate, setDaysByDate] = useState({});
  const [apiRange, setApiRange] = useState(null);

  const [selectedDate, setSelectedDate] = useState(null); // Date object
  const [selectedDay, setSelectedDay] = useState(null); // data dari API

  // Ambil data dari API sekali saat mount
  useEffect(() => {
    let cancelled = false;
    async function fetchSchedule() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(API_URL);
        if (!res.ok) {
          throw new Error(`Gagal memuat jadwal (status ${res.status})`);
        }
        const data = await res.json();

        const map = {};
        (data.days || []).forEach((d) => {
          if (d.date) map[d.date] = d;
        });

        if (!cancelled) {
          setDaysByDate(map);
          setApiRange(data.range || null);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError(
            "Jadwal konseling belum bisa dimuat. Silakan coba lagi beberapa saat lagi."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSchedule();
    return () => {
      cancelled = true;
    };
  }, []);

  // Buat grid kalender untuk bulan aktif
  const monthGrid = useMemo(() => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const firstOfMonth = new Date(y, m, 1);
    const daysInMonth = getDaysInMonth(y, m);

    // JS: 0=Sun,1=Mon,...; kita mau 0=Senin
    const jsDay = firstOfMonth.getDay(); // 0 Minggu ... 6 Sabtu
    const firstIndex = (jsDay + 6) % 7; // 0=Senin,...,6=Minggu

    const totalCells = firstIndex + daysInMonth;
    const cells = [];

    for (let i = 0; i < totalCells; i++) {
      if (i < firstIndex) {
        cells.push(null);
      } else {
        const dayNum = i - firstIndex + 1;
        const d = new Date(y, m, dayNum);
        cells.push(d);
      }
    }
    return cells;
  }, [currentMonth]);

  function handlePrevMonth() {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
  }
  function handleNextMonth() {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
  }

  function isDisabledDate(date) {
    const d0 = startOfDay(date);
    const t0 = today.getTime();
    const dt = d0.getTime();

    // Tanggal lewat
    if (dt < t0) return true;

    // Lebih dari +30 hari
    if (dt > maxDate.getTime()) return true;

    // Sabtu–Minggu
    const dow = d0.getDay(); // 0 Minggu, 6 Sabtu
    if (dow === 0 || dow === 6) return true;

    return false;
  }

  function handleSelectDate(date) {
    const disabled = isDisabledDate(date);
    const iso = toIsoDate(date);
    const dayData = daysByDate[iso];

    if (disabled || !dayData) {
      return;
    }

    setSelectedDate(date);
    setSelectedDay(dayData);

    try {
      gaEvent("psychology_schedule_open_day", {
        date: iso,
        available: dayData?.summary?.tersedia ?? 0,
      });
    } catch {}
  }

  function closeModal() {
    setSelectedDate(null);
    setSelectedDay(null);
  }

  // Jumlah sesi tersedia hari ini (untuk ringkasan kecil di atas)
  const todayKey = toIsoDate(today);
  const todayData = daysByDate[todayKey];
  const todayAvailable = todayData?.summary?.tersedia ?? 0;

  return (
    <section className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-slate-950/70 shadow-sm p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
            Jadwal Sesi Konseling Psikologi (KIRANA)
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-white/60 mt-1">
            Pilih tanggal (maksimal 30 hari ke depan) untuk melihat rincian
            sesi konseling psikososial yang tersedia.
          </p>
          {apiRange && (
            <p className="text-[11px] text-slate-500 dark:text-white/40 mt-1">
              Rentang data: {apiRange.start} s.d. {apiRange.end}
            </p>
          )}
          {todayData && (
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1">
              Hari ini: {todayAvailable} sesi tersedia
              {todayAvailable === 0 ? " (penuh atau libur)" : ""}.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 dark:text-white/60">
          <div className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />{" "}
            <span>Banyak sesi</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />{" "}
            <span>Tersisa sedikit</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500" />{" "}
            <span>Penuh</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" />{" "}
            <span>Libur / tidak bisa dipilih</span>
          </div>
        </div>
      </div>

      {/* Header bulan + navigasi */}
      <div className="flex items-center justify-between gap-2 border rounded-2xl border-black/5 dark:border-white/10 px-3 py-2 bg-slate-50/70 dark:bg-slate-900/60">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="inline-flex items-center justify-center rounded-xl px-2 py-1 text-xs sm:text-sm border border-slate-200 dark:border-slate-600 bg-white/80 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          ← Bulan sebelumnya
        </button>
        <div className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
          {MONTH_NAMES_ID[currentMonth.getMonth()]}{" "}
          {currentMonth.getFullYear()}
        </div>
        <button
          type="button"
          onClick={handleNextMonth}
          className="inline-flex items-center justify-center rounded-xl px-2 py-1 text-xs sm:text-sm border border-slate-200 dark:border-slate-600 bg-white/80 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          Bulan berikutnya →
        </button>
      </div>

      {/* Kalender */}
      <div className="space-y-1">
        <div className="grid grid-cols-7 text-[11px] sm:text-xs font-medium text-center text-slate-500 dark:text-white/50">
          {DAY_NAMES_SHORT.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 text-xs sm:text-sm">
          {monthGrid.map((date, idx) => {
            if (!date) {
              return <div key={`empty-${idx}`} />;
            }
            const iso = toIsoDate(date);
            const disabled = isDisabledDate(date);
            const dayData = daysByDate[iso];

            const isToday = toIsoDate(today) === iso;

            const dotClass = getDotClass({ disabled, dayData });

            const baseClasses =
              "w-full aspect-square rounded-xl flex flex-col items-center justify-center border text-[11px] sm:text-xs";
            const enabledClasses =
              "cursor-pointer border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 hover:bg-emerald-50 dark:hover:bg-emerald-900/20";
            const disabledClasses =
              "cursor-default border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 opacity-60";

            return (
              <button
                key={iso}
                type="button"
                onClick={() => handleSelectDate(date)}
                disabled={disabled || !dayData}
                className={
                  baseClasses +
                  " " +
                  (disabled || !dayData ? disabledClasses : enabledClasses) +
                  (isToday
                    ? " ring-1 ring-emerald-400/70 ring-offset-[1px] ring-offset-transparent"
                    : "")
                }
              >
                <div className="font-semibold text-slate-900 dark:text-white">
                  {date.getDate()}
                </div>
                <div className="mt-1">
                  <span
                    className={
                      "inline-block h-1.5 w-1.5 rounded-full " + dotClass
                    }
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Info kecil kalau loading / error */}
      {loading && (
        <div className="text-xs text-slate-500 dark:text-white/50">
          Memuat jadwal konseling…
        </div>
      )}
      {error && (
        <div className="text-xs text-red-600 dark:text-red-400">{error}</div>
      )}

      {/* Popup detail sesi */}
      <AnimatePresence>
        {selectedDate && selectedDay && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <motion.div
              className="w-full max-w-md mx-4 rounded-2xl bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 shadow-xl p-4 sm:p-5 space-y-3"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase text-slate-500 dark:text-white/50">
                    Jadwal Sesi Konseling Psikologi
                  </div>
                  <div className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                    {formatLongDateId(selectedDate)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Tutup"
                >
                  ✕
                </button>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2 max-h-72 overflow-y-auto">
                {(selectedDay.sessions || [])
                  .slice()
                  .sort((a, b) => (a.sesi || 0) - (b.sesi || 0))
                  .map((s) => (
                    <div
                      key={s.sesi}
                      className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/60 px-3 py-2.5"
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">
                          Sesi {s.sesi}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-white/60">
                          {s.jam_mulai} – {s.jam_selesai} WIB
                        </div>
                        {s.keterangan && (
                          <div className="mt-1 text-[11px] text-slate-500 dark:text-white/50">
                            {s.keterangan}
                          </div>
                        )}
                      </div>
                      <span
                        className={
                          "inline-flex items-center justify-center px-2 py-0.5 rounded-full border text-[10px] font-medium " +
                          statusPillClass(s.status)
                        }
                      >
                        {prettyStatus(s.status)}
                      </span>
                    </div>
                  ))}

                {(!selectedDay.sessions ||
                  selectedDay.sessions.length === 0) && (
                  <div className="text-xs text-slate-500 dark:text-white/60">
                    Tidak ada sesi yang terjadwal pada hari ini.
                  </div>
                )}
              </div>

              <div className="mt-2 text-[11px] text-slate-500 dark:text-white/50">
                Untuk pemesanan sesi konseling, silakan hubungi petugas melalui
                WhatsApp resmi Puskesmas Jagakarsa. Mohon cantumkan nama, NIK,
                dan keluhan singkat.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
