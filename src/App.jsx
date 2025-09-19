import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ======================= Mockup Jadwal (v2, fixed) ==========================
// Semua infografis disimpan di satu folder: public/infografis/
const IMG_DIR = "/infografis";

// Data contoh (ganti dengan data nyata)
const SERVICES = [
  {
    id: "poli-umum",
    nama: "Poli Umum",
    klaster: "Pelayanan Medik",
    ikon: "🩺",
    lokasi: "Lantai 1 — Ruang 101",
    telemed: true,
    jadwal: {
      Senin: "08:00–12:00, 13:00–16:00",
      Selasa: "08:00–12:00, 13:00–16:00",
      Rabu: "08:00–12:00, 13:00–16:00",
      Kamis: "08:00–12:00, 13:00–16:00",
      Jumat: "08:00–11:00",
      Sabtu: "Tutup",
      Minggu: "Tutup",
    },
    dokter: ["dr. Rani", "dr. Bagus"],
    tarif: [
      { nama: "KTP DKI", harga: 0 },
      { nama: "Non-DKI", harga: 25000 },
    ],
    img: "poli-umum.jpg.png", // ← file ada di public/infografis/poli-umum.jpg
    layanan: [
    { nama: "Pemeriksaan Umum", ikon: "🩺", tarif: 0, ket: "Konsultasi dokter umum" },
    { nama: "Kontrol Berkala",   ikon: "📅", tarif: 0 },
    { nama: "Surat Keterangan Sehat", ikon: "📝", tarif: 15000 },
    { nama: "Konseling",         ikon: "💬", tarif: 0 },
  ],
  },
  {
    id: "poli-gigi",
    nama: "Poli Gigi",
    klaster: "Pelayanan Medik",
    ikon: "🦷",
    lokasi: "Lantai 1 — Ruang 103",
    telemed: false,
    jadwal: {
      Senin: "08:00–12:00",
      Selasa: "08:00–12:00, 13:00–15:00",
      Rabu: "08:00–12:00",
      Kamis: "08:00–12:00",
      Jumat: "08:00–11:00",
      Sabtu: "Tutup",
      Minggu: "Tutup",
    },
    dokter: ["drg. Salsa"],
    tarif: [
      { nama: "KTP DKI", harga: 0 },
      { nama: "Tambal Karies Ringan", harga: 30000 },
      { nama: "Skeling Gigi", harga: 40000 },
    ],
    img: "poli-gigi.jpg",
     layanan: [
    { nama: "Cabut Gigi",        ikon: "🦷", tarif: 30000 },
    { nama: "Scaling (Pembersihan Karang)", ikon: "🪥", tarif: 40000 },
    { nama: "Penambalan Gigi",   ikon: "🧱", tarif: 30000 },
    { nama: "Konsultasi Gigi",   ikon: "💬", tarif: 0 },
  ],
  },
  {
  id: "ki-hamil",
  nama: "KI Hamil",
  klaster: "Kesehatan Ibu & Anak",
  ikon: "🤰",
  lokasi: "Lantai 2 — Ruang KIA",
  telemed: false,
  instalasi: "Rawat Jalan",
  poli: "KI HAMIL",
  jadwal: {
    Senin:  "08:00–12:00",
    Selasa: "08:00–12:00",
    Rabu:   "08:00–12:00",
    Kamis:  "08:00–12:00",
    Jumat:  "08:00–11:00",
    Sabtu:  "Tutup",
    Minggu: "Tutup",
  },
  dokter: ["Bidan Nisa"],
  tarif: [{ nama: "KTP DKI", harga: 0 }, { nama: "Umum", harga: 20000 }],
  img: "ki-hamil.jpg",
  layanan: [
    { nama: "Pemeriksaan Kehamilan", ikon: "🤰", tarif: 0 },
    { nama: "Suntik KB",             ikon: "💉", tarif: 15000 },
    { nama: "Implant KB",            ikon: "🧷", tarif: 75000 },
    { nama: "Konseling Laktasi",     ikon: "🍼", tarif: 0 },
  ],
},
{
  id: "ki-nifas",
  nama: "KI Nifas",
  klaster: "Kesehatan Ibu & Anak",
  ikon: "👶",
  lokasi: "Lantai 2 — Ruang KIA",
  telemed: false,
  instalasi: "Rawat Jalan",
  poli: "KI NIFAS",
  jadwal: {
    Senin:  "08:00–12:00",
    Rabu:   "08:00–12:00",
    Jumat:  "08:00–11:00",
    Selasa: "Tutup",
    Kamis:  "Tutup",
    Sabtu:  "Tutup",
    Minggu: "Tutup",
  },
  dokter: ["Bidan Riko"],
  tarif: [{ nama: "KTP DKI", harga: 0 }, { nama: "Umum", harga: 20000 }],
  img: "ki-nifas.jpg",
},
{
  id: "mtbs",
  nama: "MTBS",
  klaster: "Kesehatan Anak",
  ikon: "🧒",
  lokasi: "Lantai 2 — MTBS",
  telemed: false,
  instalasi: "Rawat Jalan",
  poli: "MTBS",
  jadwal: {
    Senin:  "08:00–12:00",
    Rabu:   "08:00–12:00",
    Kamis:  "13:00–16:00",
    Selasa: "Tutup",
    Jumat:  "Tutup",
    Sabtu:  "Tutup",
    Minggu: "Tutup",
  },
  dokter: ["dr. Anak Dini"],
  tarif: [{ nama: "KTP DKI", harga: 0 }, { nama: "Umum", harga: 25000 }],
  img: "mtbs.jpg",
},
{
  id: "ispa",
  nama: "ISPA",
  klaster: "Pelayanan Medik",
  ikon: "🤧",
  lokasi: "Lantai 1 — Ruang ISPA",
  telemed: true,
  instalasi: "Rawat Jalan",
  poli: "ISPA",
  jadwal: {
    Senin:  "08:00–12:00, 13:00–16:00",
    Selasa: "08:00–12:00, 13:00–16:00",
    Rabu:   "08:00–12:00, 13:00–16:00",
    Kamis:  "08:00–12:00, 13:00–16:00",
    Jumat:  "08:00–11:00",
    Sabtu:  "Tutup",
    Minggu: "Tutup",
  },
  dokter: ["dr. Rosi"],
  tarif: [{ nama: "KTP DKI", harga: 0 }, { nama: "Umum", harga: 20000 }],
  img: "ispa.jpg",
},
{
  id: "mata",
  nama: "Poli Mata",
  klaster: "Pelayanan Medik",
  ikon: "👁️",
  lokasi: "Lantai 1 — Poli Mata",
  telemed: false,
  instalasi: "Rawat Jalan",
  poli: "MATA",
  jadwal: {
    Selasa: "08:00–12:00",
    Kamis:  "08:00–12:00",
    Senin:  "Tutup",
    Rabu:   "Tutup",
    Jumat:  "Tutup",
    Sabtu:  "Tutup",
    Minggu: "Tutup",
  },
  dokter: ["dr. Raka (Sp.M)"],
  tarif: [{ nama: "KTP DKI", harga: 0 }, { nama: "Umum", harga: 30000 }],
  img: "mata.jpg",
},
{
  id: "lansia",
  nama: "Klinik Lansia",
  klaster: "Pelayanan Medik",
  ikon: "👵",
  lokasi: "Lantai 1 — Poli Lansia",
  telemed: true,
  instalasi: "Rawat Jalan",
  poli: "LANSIA",
  jadwal: {
    Selasa: "13:00–16:00",
    Kamis:  "13:00–16:00",
    Senin:  "Tutup",
    Rabu:   "Tutup",
    Jumat:  "Tutup",
    Sabtu:  "Tutup",
    Minggu: "Tutup",
  },
  dokter: ["dr. Rini"],
  tarif: [{ nama: "KTP DKI", harga: 0 }, { nama: "Umum", harga: 20000 }],
  img: "lansia.jpg",
},
{
  id: "ptm",
  nama: "Klinik PTM",
  klaster: "Penyakit Tidak Menular",
  ikon: "❤️",
  lokasi: "Lantai 1 — PTM",
  telemed: false,
  instalasi: "Rawat Jalan",
  poli: "PTM",
  jadwal: {
    Selasa: "08:00–12:00",
    Kamis:  "08:00–12:00",
    Senin:  "Tutup",
    Rabu:   "Tutup",
    Jumat:  "Tutup",
    Sabtu:  "Tutup",
    Minggu: "Tutup",
  },
  dokter: ["dr. Yoga"],
  tarif: [{ nama: "KTP DKI", harga: 0 }, { nama: "Umum", harga: 25000 }],
  img: "ptm.jpg",
},
{
  id: "pm",
  nama: "PM",
  klaster: "Program Kesehatan",
  ikon: "📋",
  lokasi: "Lantai 2 — PM",
  telemed: false,
  instalasi: "Rawat Jalan",
  poli: "PM",
  jadwal: {
    Selasa: "08:00–12:00",
    Jumat:  "08:00–11:00",
    Senin:  "Tutup",
    Rabu:   "Tutup",
    Kamis:  "Tutup",
    Sabtu:  "Tutup",
    Minggu: "Tutup",
  },
  dokter: ["Petugas Program"],
  tarif: [{ nama: "KTP DKI", harga: 0 }],
  img: "pm.jpg",
},
{
  id: "ims",
  nama: "Klinik IMS",
  klaster: "Pelayanan Medik",
  ikon: "🧬",
  lokasi: "Lantai 1 — IMS",
  telemed: false,
  instalasi: "Rawat Jalan",
  poli: "IMS",
  jadwal: {
    Senin:  "13:00–16:00",
    Kamis:  "13:00–16:00",
    Selasa: "Tutup",
    Rabu:   "Tutup",
    Jumat:  "Tutup",
    Sabtu:  "Tutup",
    Minggu: "Tutup",
  },
  dokter: ["dr. Satria"],
  tarif: [{ nama: "KTP DKI", harga: 0 }, { nama: "Umum", harga: 30000 }],
  img: "ims.jpg",
},
{
  id: "pkpr",
  nama: "PKPR (Remaja)",
  klaster: "Pelayanan Remaja",
  ikon: "🎒",
  lokasi: "Lantai 2 — PKPR",
  telemed: true,
  instalasi: "Rawat Jalan",
  poli: "PKPR",
  jadwal: {
    Rabu:   "13:00–16:00",
    Jumat:  "09:00–11:00",
    Senin:  "Tutup",
    Selasa: "Tutup",
    Kamis:  "Tutup",
    Sabtu:  "Tutup",
    Minggu: "Tutup",
  },
  dokter: ["Konselor Remaja"],
  tarif: [{ nama: "Gratis Konseling Dasar", harga: 0 }],
  img: "pkpr.jpg",
},
{
  id: "tumbang",
  nama: "Klinik Tumbuh Kembang",
  klaster: "Kesehatan Anak",
  ikon: "🌱",
  lokasi: "Lantai 2 — Tumbang",
  telemed: false,
  instalasi: "Rawat Jalan",
  poli: "TUMBANG",
  jadwal: {
    Selasa: "13:00–16:00",
    Kamis:  "13:00–16:00",
    Senin:  "Tutup",
    Rabu:   "Tutup",
    Jumat:  "Tutup",
    Sabtu:  "Tutup",
    Minggu: "Tutup",
  },
  dokter: ["Terapis Tumbuh Kembang"],
  tarif: [{ nama: "KTP DKI", harga: 0 }, { nama: "Umum", harga: 25000 }],
  img: "tumbang.jpg",
},
{
  id: "karyawan",
  nama: "Klinik Karyawan",
  klaster: "Kesehatan Kerja",
  ikon: "🧑‍💼",
  lokasi: "Lantai 2 — Karyawan",
  telemed: false,
  instalasi: "Rawat Jalan",
  poli: "KARYAWAN",
  jadwal: {
    Selasa: "13:00–15:00",
    Kamis:  "13:00–15:00",
    Senin:  "Tutup",
    Rabu:   "Tutup",
    Jumat:  "Tutup",
    Sabtu:  "Tutup",
    Minggu: "Tutup",
  },
  dokter: ["dr. Okta"],
  tarif: [{ nama: "Umum", harga: 15000 }],
  img: "karyawan.jpg",
},
{
  id: "menza",
  nama: "Menza (Gizi)",
  klaster: "Pelayanan Gizi",
  ikon: "🥗",
  lokasi: "Lantai 1 — Gizi",
  telemed: true,
  instalasi: "Rawat Jalan",
  poli: "MENZA",
  jadwal: {
    Senin:  "08:00–12:00",
    Rabu:   "08:00–12:00",
    Jumat:  "08:00–11:00",
    Selasa: "Tutup",
    Kamis:  "Tutup",
    Sabtu:  "Tutup",
    Minggu: "Tutup",
  },
  dokter: ["Nutrisionis"],
  tarif: [{ nama: "Konseling Gizi", harga: 20000 }],
  img: "menza.jpg",
},
{
  id: "home-care",
  nama: "Home Care",
  klaster: "Perawatan Rumah",
  ikon: "🏠",
  lokasi: "Kunjungan Rumah",
  telemed: false,
  instalasi: "Rawat Jalan",
  poli: "HOME CARE",
  jadwal: {
    Selasa: "09:00–15:00",
    Kamis:  "09:00–15:00",
    Senin:  "Tutup",
    Rabu:   "Tutup",
    Jumat:  "Tutup",
    Sabtu:  "Tutup",
    Minggu: "Tutup",
  },
  dokter: ["Tim Home Care"],
  tarif: [{ nama: "Kunjungan", harga: 50000 }],
  img: "home-care.jpg",
},
{
  id: "rujukan",
  nama: "Rujukan",
  klaster: "Pelayanan Rujukan",
  ikon: "🔁",
  lokasi: "Loket Rujukan",
  telemed: false,
  instalasi: "Rawat Jalan",
  poli: "RUJUKAN",
  jadwal: {
    Senin:  "08:00–12:00, 13:00–16:00",
    Selasa: "08:00–12:00, 13:00–16:00",
    Rabu:   "08:00–12:00, 13:00–16:00",
    Kamis:  "08:00–12:00, 13:00–16:00",
    Jumat:  "08:00–11:00",
    Sabtu:  "Tutup",
    Minggu: "Tutup",
  },
  dokter: ["Petugas Rujukan"],
  tarif: [{ nama: "Administrasi", harga: 0 }],
  img: "rujukan.jpg",
},
{
  id: "akupresur",
  nama: "Akupresur",
  klaster: "Pelayanan Komplementer",
  ikon: "👐",
  lokasi: "Lantai 1 — Akupresur",
  telemed: false,
  instalasi: "Rawat Jalan",
  poli: "AKUPRESUR",
  jadwal: {
    Rabu:   "09:00–12:00",
    Jumat:  "09:00–11:00",
    Senin:  "Tutup",
    Selasa: "Tutup",
    Kamis:  "Tutup",
    Sabtu:  "Tutup",
    Minggu: "Tutup",
  },
  dokter: ["Terapis Komplementer"],
  tarif: [{ nama: "Sesi Akupresur", harga: 30000 }],
  img: "akupresur.jpg",
},
{
  id: "pusling-cipedak",
  nama: "Pusling Cipedak",
  klaster: "Puskesmas Keliling",
  ikon: "🚐",
  lokasi: "Kelurahan Cipedak (Layanan Keliling)",
  telemed: false,
  instalasi: "Rawat Jalan",
  poli: "PUSLING CIPEDAK",
  jadwal: {
    Selasa: "08:00–12:00",
    Kamis:  "08:00–12:00",
    Senin:  "Tutup",
    Rabu:   "Tutup",
    Jumat:  "Tutup",
    Sabtu:  "Tutup",
    Minggu: "Tutup",
  },
  dokter: ["Tim Pusling"],
  tarif: [{ nama: "Gratis", harga: 0 }],
  img: "pusling-cipedak.jpg",
},
{
  id: "igd",
  nama: "IGD",
  klaster: "Gawat Darurat",
  ikon: "🚑",
  lokasi: "Lantai 1 — IGD",
  telemed: false,
  instalasi: "Rawat Jalan",
  poli: "IGD",
  jadwal: {
    Senin:  "00:00–23:59",
    Selasa: "00:00–23:59",
    Rabu:   "00:00–23:59",
    Kamis:  "00:00–23:59",
    Jumat:  "00:00–23:59",
    Sabtu:  "00:00–23:59",
    Minggu: "00:00–23:59",
  },
  dokter: ["Dokter Jaga IGD"],
  tarif: [{ nama: "Gawat Darurat (BPJS)", harga: 0 }, { nama: "Umum (Triase)", harga: 50000 }],
  img: "igd.jpg",
},
{
  id: "kirana-konseling",
  nama: "KIRANA Konseling",
  klaster: "Kesehatan Jiwa",
  ikon: "🧠",
  lokasi: "Lantai 2 — KIRANA",
  telemed: true,
  instalasi: "Rawat Jalan",
  poli: "KIRANA KONSELING",
  jadwal: {
    Selasa: "13:00–16:00",
    Kamis:  "13:00–16:00",
    Senin:  "Tutup",
    Rabu:   "Tutup",
    Jumat:  "Tutup",
    Sabtu:  "Tutup",
    Minggu: "Tutup",
  },
  dokter: ["Psikolog Klinis"],
  tarif: [{ nama: "Sesi Konseling", harga: 40000 }],
  img: "kirana-konseling.jpg",
},
  {
  id: "pelayanan-24-jam",
  nama: "Pelayanan 24 Jam",
  klaster: "Pelayanan Medik",
  ikon: "🕘",
  lokasi: "IGD / Lantai 1",
  telemed: false,

  // Opsional (kalau kamu pakai filter ini)
  instalasi: "Rawat Jalan",
  poli: "Pelayanan 24 Jam",

  // Buka hanya di LUAR jam kerja 08.00–16.00 (Senin–Jumat)
  // → Weekdays: 00:00–08:00 dan 16:00–23:59
  // → Weekend: 00:00–23:59
  jadwal: {
    Senin:  "00:00–08:00, 16:00–23:59",
    Selasa: "00:00–08:00, 16:00–23:59",
    Rabu:   "00:00–08:00, 16:00–23:59",
    Kamis:  "00:00–08:00, 16:00–23:59",
    Jumat:  "00:00–08:00, 16:00–23:59",
    Sabtu:  "00:00–23:59",
    Minggu: "00:00–23:59",
  },

  dokter: ["Dokter Jaga A", "Dokter Jaga B"],

  tarif: [
    { nama: "BPJS (Gawat Darurat)", harga: 0 },
    { nama: "Umum / Non-BPJS (triase & tindakan awal)", harga: 20000 },
  ],

  // Simpan gambar di: public/infografis/pelayanan-24-jam.jpg
  img: "pelayanan-24-jam.jpg",

  // Catatan opsional
  catatan: "Pelayanan aktif malam hari & akhir pekan; hari kerja aktif di luar 08:00–16:00."
}
,
  {
    id: "kia-kb",
    nama: "KIA / KB",
    klaster: "Kesehatan Ibu & Anak",
    ikon: "👶",
    lokasi: "Lantai 2 — Ruang KIA",
    telemed: false,
    jadwal: {
      Senin: "08:00–12:00",
      Selasa: "08:00–12:00",
      Rabu: "08:00–12:00",
      Kamis: "08:00–12:00",
      Jumat: "08:00–11:00",
      Sabtu: "Tutup",
      Minggu: "Tutup",
    },
    dokter: ["Bidan Nisa", "Bidan Riko"],
    tarif: [
      { nama: "KTP DKI", harga: 0 },
      { nama: "Suntik KB", harga: 15000 },
      { nama: "Implant KB", harga: 75000 },
    ],
    img: "kia-kb.jpg",
  },
];

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

// Helpers --------------------------------------------------------------------
const resolveImg = (s) => {
  const p = s.img || `${s.id}.jpg`;
  if (p.startsWith("http") || p.startsWith("/")) return p;
  return `${IMG_DIR}/${p}`;
};

// ---- OPEN/CLOSED BADGE (pakai waktu sekarang) ------------------------------
const DAY_NAMES_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function parseTimeToDate(timeStr, refDate) {
  const [h, m] = (timeStr || "").split(":").map((n) => parseInt(n, 10) || 0);
  const d = new Date(refDate);
  d.setHours(h, m, 0, 0);
  return d;
}

function isOpenNow(service, refDate = new Date()) {
  const dayName = DAY_NAMES_ID[refDate.getDay()];
  const info = service?.jadwal?.[dayName];
  if (!info) return false;
  const lc = String(info).toLowerCase();
  if (lc.includes("tutup")) return false;

  return String(info)
    .split(",")
    .some((range) => {
      const clean = range.trim().replace(/–|—/g, "-");
      const [start, end] = clean.split("-").map((s) => s.trim());
      if (!start || !end) return false;
      const a = parseTimeToDate(start, refDate);
      const b = parseTimeToDate(end, refDate);
      return refDate >= a && refDate <= b;
    });
}

const StatusPill = ({ open }) => (
  <span
    className={`ml-auto text-[11px] px-2 py-1 rounded-full border ${
      open
        ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-300"
        : "bg-rose-500/10 border-rose-400/30 text-rose-300"
    }`}
  >
    {open ? "Buka" : "Tutup"}
  </span>
);

function Rupiah({ n }) {
  if (n === 0)
    return <span className="px-2 rounded bg-emerald-600/20 text-emerald-300">Gratis</span>;
  return <span className="px-2 rounded bg-sky-600/20 text-sky-300">Rp {n.toLocaleString("id-ID")}</span>;
}

function Chip({ children }) {
  return (
    <span className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 whitespace-nowrap">
      {children}
    </span>
  );
}

// Sidebar --------------------------------------------------------------------
function Sidebar({ query, setQuery, day, setDay, services, onPick, selected }) {
  return (
    <aside className="w-full md:w-[23rem] shrink-0 bg-slate-950/70 backdrop-blur border-r border-white/10">
      <div className="p-4 flex items-center gap-2 border-b border-white/10">
        <div className="size-8 rounded-xl bg-emerald-600 grid place-items-center">🏥</div>
        <div className="font-semibold">Jadwal & Tarif</div>
      </div>

      <div className="p-4 space-y-3">
        <label className="text-xs uppercase text-white/50">Pencarian</label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari 'umum', 'gigi', ..."
          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none focus:ring-2 focus:ring-emerald-500"
        />

        <label className="text-xs uppercase text-white/50">Hari</label>
        <select
          value={day}
          onChange={(e) => setDay(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10"
        >
          <option value="">Semua hari</option>
          {DAYS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div className="px-4 pb-2 max-h-[36vh] overflow-auto space-y-2">
        <div className="text-xs uppercase text-white/50 mb-2">Daftar Poli</div>
        {services.map((s) => (
          <button
            key={s.id}
            onClick={() => onPick(s)}
            className={`group w-full text-left p-3 rounded-xl border transition hover:bg-white/5 ${
              selected?.id === s.id ? "border-emerald-500/60 bg-emerald-500/10" : "border-white/10"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="text-lg">{s.ikon}</div>
              <div className="min-w-0">
                <div className="font-medium truncate">{s.nama}</div>
                <div className="text-xs text-white/60 truncate">{s.klaster}</div>
              </div>
              <StatusPill open={isOpenNow(s)} />
            </div>
          </button>
        ))}
        {services.length === 0 && (
          <div className="text-sm text-white/50">Tidak ada hasil untuk kata kunci/filters.</div>
        )}
      </div>

      {selected && (
        <div className="p-4 border-t border-white/10 space-y-4">
          <div className="flex items-center gap-2">
            <div className="text-2xl">{selected.ikon}</div>
            <div>
              <div className="font-semibold leading-tight">{selected.nama}</div>
              <div className="text-xs text-white/60">{selected.lokasi}</div>
            </div>
          </div>

          <div>
            <div className="text-xs uppercase text-white/50 mb-1">Jadwal</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {DAYS.map((d) => (
                <div key={d} className="p-2 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-[10px] text-white/50 uppercase">{d}</div>
                  <div className="mt-1 min-h-9">{selected.jadwal[d] || <span className="text-white/40">—</span>}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase text-white/50 mb-1">Tarif</div>
            <div className="space-y-2">
              {selected.tarif.map((t, i) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <span className="text-white/80">{t.nama}</span>
                  <Rupiah n={t.harga} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

// Kartu grid -----------------------------------------------------------------
function ServiceCard({ s, onPick }) {
  return (
    <button
      onClick={() => onPick(s)}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-left"
    >
      <div className="aspect-[16/9] w-full overflow-hidden">
        <img
          src={resolveImg(s)}
          alt={s.nama}
          className="w-full h-full object-cover group-hover:scale-105 transition"
        />
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2">
          <div className="text-xl">{s.ikon}</div>
          <div className="font-semibold truncate">{s.nama}</div>
        </div>
        <div className="text-xs text-white/60 mt-1 truncate">{s.klaster}</div>
      </div>
    </button>
  );
}

// Kartu layanan tambahan ------------------------------------------------------
function SubServiceCard({ item }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="text-xl">{item.ikon ?? "🧩"}</div>
          <div className="font-semibold">{item.nama}</div>
          <div className="ml-auto">{typeof item.tarif === "number" ? <Rupiah n={item.tarif} /> : null}</div>
        </div>
        {item.ket && <div className="text-sm text-white/60 mt-1">{item.ket}</div>}
      </div>
    </div>
  );
}

// Panel kanan ----------------------------------------------------------------
function RightPanel({ selected, setSelected, filtered }) {
  const title = !selected ? "Pilih poli untuk melihat jenis layanannya." :
                             `Jenis Layanan — ${selected.nama}`;

  const list = selected ? (selected.layanan ?? []) : filtered;

  return (
    <div className="min-h-[calc(100svh-64px)] p-4 md:p-6">
      <AnimatePresence mode="wait">
        {!selected ? (
          <motion.div
            key="grid-poli"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
          >
            <div className="mb-3 text-white/70">{title}</div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {list.map((s) => (
                <ServiceCard key={s.id} s={s} onPick={setSelected} />
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={`grid-layanan-${selected.id}`}
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -80 }}
            transition={{ duration: 0.35 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelected(null)}
                className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20"
              >
                ← Kembali
              </button>
              <div className="text-2xl">{selected.ikon}</div>
              <h2 className="text-xl md:text-2xl font-semibold">{selected.nama}</h2>
              <div className="ml-auto flex gap-2">
                <Chip>{selected.klaster}</Chip>
                {selected.telemed && <Chip>Telemed</Chip>}
              </div>
            </div>

            <div className="mb-3 text-white/70">{title}</div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {list.length > 0 ? (
                list.map((it, i) => <SubServiceCard key={i} item={it} />)
              ) : (
                <div className="text-white/60">Belum ada jenis layanan terdaftar.</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


// App ------------------------------------------------------------------------
export default function App() {
  const [query, setQuery] = useState("");
  const [day, setDay] = useState("");
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SERVICES.filter((s) => {
      const matchQ = !q || s.nama.toLowerCase().includes(q) || s.klaster.toLowerCase().includes(q);
      const matchDay = !day || Boolean(s.jadwal[day]);
      return matchQ && matchDay;
    });
  }, [query, day]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white">
      <header className="sticky top-0 z-30 backdrop-blur bg-slate-900/70 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-emerald-600 grid place-items-center">🏥</div>
            <div className="font-semibold">Penampil Jadwal & Tarif Layanan</div>
          </div>
          <div className="ml-auto hidden md:flex text-sm gap-2 text-white/70">
            <Chip>Mobile-first</Chip>
            <Chip>Infografis</Chip>
            <Chip>Animated</Chip>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto md:px-4 grid md:grid-cols-[24rem_1fr]">
        <Sidebar
          query={query}
          setQuery={setQuery}
          day={day}
          setDay={setDay}
          services={filtered}
          onPick={(s) => setSelected(s)}
          selected={selected}
        />
        <RightPanel selected={selected} setSelected={setSelected} filtered={filtered} />
      </div>

      <footer className="py-6 text-center text-white/50 text-sm">
        © 2025 Puskesmas Jagakarsa — Mockup UI.
      </footer>
    </div>
  );
}
