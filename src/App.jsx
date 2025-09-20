import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ============================================================================
   Path helper (aman untuk GitHub Pages) 
   - Infografis:  public/infografis/<file>.jpg
   - Alur:        public/alur/<file>.jpg
============================================================================ */
const BASE = import.meta.env.BASE_URL ?? "/";

// ---------- Infografis (per poli) ----------
const IMG_DIR = `${BASE}infografis`;
const resolveImg = (s) => {
  const p = (s?.img ?? `${s?.id ?? "missing"}.jpg`).toString();
  if (p.startsWith("http://") || p.startsWith("https://")) return p; // URL penuh
  if (p.startsWith("/")) return `${BASE}${p.slice(1)}`;               // absolut → relatif base
  return `${IMG_DIR}/${p}`;                                          // nama file di /infografis
};
const INFO_FALLBACK =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><rect width="100%" height="100%" fill="%231f2937"/><text x="50%" y="50%" fill="white" font-family="Segoe UI,Arial" font-size="22" text-anchor="middle" dominant-baseline="middle">Infografis tidak ditemukan</text></svg>';
const onInfoImgError = (e) => { e.currentTarget.onerror = null; e.currentTarget.src = INFO_FALLBACK; };

// ---------- Alur layanan (shared) ----------
const FLOW_IMG_DIR = `${BASE}alur`;
const FLOW_MAP = {
  0: null,                        // blank
  1: "1-menuju-loket.jpg",        // menuju loket
  2: "2-menuju-kasir.jpg",        // menuju kasir
  3: "3-menuju-poli-gigi.jpg",    // menuju poli gigi (contoh)
  4: "4-menuju-farmasi.jpg",      // turun ke lantai 1 → farmasi
  5: "5-selesai.jpg",             // alur selesai
};
const resolveFlowImg = (code) => {
  const f = FLOW_MAP[code] ?? null;
  return f ? `${FLOW_IMG_DIR}/${f}` : null;
};
const FLOW_FALLBACK =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360"><rect width="100%" height="100%" fill="%231f2937"/><text x="50%" y="50%" fill="white" font-family="Segoe UI,Arial" font-size="16" text-anchor="middle" dominant-baseline="middle">Gambar alur tidak ditemukan</text></svg>';
const onFlowImgError = (e) => { e.currentTarget.onerror = null; e.currentTarget.src = FLOW_FALLBACK; };

/* ============================================================================
   Data
============================================================================ */
const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

// Contoh data poli (ganti dengan data nyata)
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
    img: "poli-umum.jpg.png",
    layanan: [
      { nama: "Pemeriksaan Umum", ikon: "🩺", tarif: 0, ket: "Konsultasi dokter umum", alur: [1,5,0,0,0,0,0,0,0] },
      { nama: "Kontrol Berkala",   ikon: "📅", tarif: 0, alur: [1,5,0,0,0,0,0,0,0] },
      { nama: "Surat Keterangan Sehat", ikon: "📝", tarif: 15000, alur: [1,2,5,0,0,0,0,0,0] },
      { nama: "Konseling",         ikon: "💬", tarif: 0, alur: [1,5,0,0,0,0,0,0,0] },
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
      { nama: "Cabut Gigi",        ikon: "🦷", tarif: 30000, alur: [1,2,3,4,5,0,0,0,0] },
      { nama: "Scaling (Pembersihan Karang)", ikon: "🪥", tarif: 40000, alur: [1,3,4,5,0,0,0,0,0] },
      { nama: "Penambalan Gigi",   ikon: "🧱", tarif: 30000, alur: [1,3,2,4,5,0,0,0,0] },
      { nama: "Konsultasi Gigi",   ikon: "💬", tarif: 0, alur: [1,3,5,0,0,0,0,0,0] },
    ],
  },
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
    layanan: [
      { nama: "Pemeriksaan Kehamilan", ikon: "🤰", tarif: 0, alur: [1,5,0,0,0,0,0,0,0] },
      { nama: "Suntik KB",             ikon: "💉", tarif: 15000, alur: [1,2,5,0,0,0,0,0,0] },
      { nama: "Implant KB",            ikon: "🧷", tarif: 75000, alur: [1,2,5,0,0,0,0,0,0] },
      { nama: "Konseling Laktasi",     ikon: "🍼", tarif: 0, alur: [1,5,0,0,0,0,0,0,0] },
    ],
  },
];

/* ============================================================================
   Helpers UI
============================================================================ */
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
      const r = range.trim().replace(/–|—/g, "-");
      const [start, end] = r.split("-").map((s) => s.trim());
      if (!start || !end) return false;
      const a = parseTimeToDate(start, refDate);
      const b = parseTimeToDate(end, refDate);
      return refDate >= a && refDate <= b;
    });
}

const Chip = ({ children }) => (
  <span className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 whitespace-nowrap">
    {children}
  </span>
);

function Rupiah({ n }) {
  if (n === 0) return <span className="px-2 rounded bg-emerald-600/20 text-emerald-300">Gratis</span>;
  return <span className="px-2 rounded bg-sky-600/20 text-sky-300">Rp {n.toLocaleString("id-ID")}</span>;
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

/* ============================================================================
   Sidebar = Daftar Poli
============================================================================ */
function Sidebar({ query, setQuery, services, onPick, selected }) {
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
      </div>

      <div className="px-4 pb-2 max-h-[calc(100svh-200px)] overflow-auto space-y-2">
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
          <div className="text-sm text-white/50">Tidak ada hasil untuk kata kunci.</div>
        )}
      </div>
    </aside>
  );
}

/* ============================================================================
   Kartu grid POLI
============================================================================ */
function ServiceCard({ s, onPick }) {
  return (
    <button
      onClick={() => onPick(s)}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-left"
    >
      <div className="aspect-[16/9] w-full overflow-hidden">
        <img
          src={resolveImg(s)}
          onError={onInfoImgError}
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

/* ============================================================================
   Kartu sub-layanan (jenis layanan per poli)
============================================================================ */
function SubServiceCard({ item, onPick }) {
  return (
    <button
      onClick={() => onPick(item)}
      className="w-full text-left rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="text-xl">{item.ikon ?? "🧩"}</div>
          <div className="font-semibold">{item.nama}</div>
          <div className="ml-auto">
            {typeof item.tarif === "number" ? <Rupiah n={item.tarif} /> : null}
          </div>
        </div>
        {item.ket && <div className="text-sm text-white/60 mt-1">{item.ket}</div>}
      </div>
    </button>
  );
}

/* ============================================================================
   Kartu langkah alur (9 kartu)
============================================================================ */
function FlowCard({ code, index }) {
  const src = resolveFlowImg(code);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="px-3 pt-2 text-[11px] text-white/50">Langkah {index + 1}</div>
      <div className="p-3 flex items-center justify-center">
        {src ? (
          <img
            src={src}
            onError={onFlowImgError}
            alt={`Langkah ${index + 1}`}
            className="max-w-full h-auto object-contain"
          />
        ) : (
          <div className="w-full aspect-[4/3] grid place-items-center text-white/30 text-sm">
            —
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   Panel kanan (3 keadaan)
============================================================================ */
function RightPanel({ selected, setSelected, filtered }) {
  const [sub, setSub] = useState(null);
  useEffect(() => setSub(null), [selected]); // reset saat ganti poli

  // 1) Belum pilih poli → grid poli
  if (!selected) {
    return (
      <div className="min-h-[calc(100svh-64px)] p-4 md:p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key="grid-poli"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
          >
            <div className="mb-3 text-white/70">Pilih poli untuk melihat jenis layanannya.</div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((s) => (
                <ServiceCard key={s.id} s={s} onPick={setSelected} />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // 2) Sudah pilih poli, belum pilih layanan → grid sub-layanan
  if (!sub) {
    const list = selected.layanan ?? [];
    return (
      <div className="min-h-[calc(100svh-64px)] p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelected(null)}
            className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20"
          >
            ← Kembali
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-2xl">{selected.ikon}</div>
          <h2 className="text-xl md:text-2xl font-semibold">{selected.nama}</h2>
          <div className="ml-auto flex gap-2">
            <Chip>{selected.klaster}</Chip>
            {selected.telemed && <Chip>Telemed</Chip>}
          </div>
        </div>

        <div className="mb-1 text-white/70">Jenis Layanan — {selected.nama}</div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.length > 0 ? (
            list.map((it, i) => <SubServiceCard key={i} item={it} onPick={setSub} />)
          ) : (
            <div className="text-white/60">Belum ada jenis layanan terdaftar.</div>
          )}
        </div>
      </div>
    );
  }

  // 3) Sudah pilih layanan → 9 langkah alur
  const steps = Array.from({ length: 9 }, (_, i) => sub.alur?.[i] ?? 0);

  return (
    <div className="min-h-[calc(100svh-64px)] p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSub(null)}
          className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20"
        >
          ← Kembali
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-2xl">{selected.ikon}</div>
        <h2 className="text-xl md:text-2xl font-semibold">
          {selected.nama} — {sub.nama}
        </h2>
        <div className="ml-auto flex gap-2">
          <Chip>{selected.klaster}</Chip>
          {selected.telemed && <Chip>Telemed</Chip>}
        </div>
      </div>

      <div className="text-white/70">
        Alur layanan untuk: <span className="font-medium">{sub.nama}</span>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((code, i) => (
          <FlowCard key={i} code={code} index={i} />
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
   App
============================================================================ */
export default function App() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SERVICES.filter((s) => {
      const matchQ =
        !q ||
        s.nama.toLowerCase().includes(q) ||
        s.klaster.toLowerCase().includes(q);
      return matchQ;
    });
  }, [query]);

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
