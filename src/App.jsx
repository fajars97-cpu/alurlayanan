import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ===================== Path helpers ===================== */
const BASE = import.meta.env.BASE_URL ?? "/";
const asset = (p) => `${BASE}${String(p).replace(/^\/+/, "")}`;
const DIR_INFO = `${BASE}infografis`;
const DIR_FLOW = `${BASE}alur`;

/* ===================== Infografis helpers ===================== */
const resolveInfografis = (service) => {
  const file = (service?.img ?? `${service?.id ?? "missing"}.jpg`).toString();
  if (/^https?:\/\//.test(file)) return file;
  if (file.startsWith("/")) return asset(file);
  return `${DIR_INFO}/${file}`;
};
const INFO_FALLBACK =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><rect width="100%" height="100%" fill="%231f2937"/><text x="50%" y="50%" fill="white" font-family="Segoe UI,Arial" font-size="22" text-anchor="middle" dominant-baseline="middle">Infografis tidak ditemukan</text></svg>';
const onInfoError = (e) => { e.currentTarget.onerror = null; e.currentTarget.src = INFO_FALLBACK; };

/* ===================== Flow helpers ===================== */
const FLOW_MAP = { 0:null, 1:"1-menuju-loket.jpg", 2:"2-menuju-kasir.jpg", 3:"3-menuju-poli-gigi.jpg", 4:"4-menuju-farmasi.jpg", 5:"5-selesai.jpg" };
const resolveFlowImg = (code) => (FLOW_MAP[code] ? `${DIR_FLOW}/${FLOW_MAP[code]}` : null);
const FLOW_FALLBACK =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360"><rect width="100%" height="100%" fill="%231f2937"/><text x="50%" y="50%" fill="white" font-family="Segoe UI,Arial" font-size="16" text-anchor="middle" dominant-baseline="middle">Gambar alur tidak ditemukan</text></svg>';
const onFlowError = (e) => { e.currentTarget.onerror = null; e.currentTarget.src = FLOW_FALLBACK; };

/* ===================== Audio singleton ===================== */
function getFlowAudio() {
  if (!window.__flowAudio) {
    window.__flowAudio = new Audio();
    window.__flowAudioKey = null;
  }
  return window.__flowAudio;
}
function stopFlowAudio() {
  const a = getFlowAudio();
  try { a.pause(); a.currentTime = 0; } catch {}
}

/* ===================== Jadwal helpers ===================== */
const DAY_NAMES_ID = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
const RULE_DEFAULT = { Senin:"08:00–16:00", Selasa:"08:00–16:00", Rabu:"08:00–16:00", Kamis:"08:00–16:00", Jumat:"08:00–16:00", Sabtu:"Tutup", Minggu:"Tutup" };
function buildRuleJadwal(service){
  const id = (service?.id || "").toLowerCase();
  if (id === "igd") return Object.fromEntries(DAY_NAMES_ID.map((d)=>[d,"00:00–24:00"]));
  if (id.includes("pelayanan-24")) return Object.fromEntries(DAY_NAMES_ID.map((d)=>[d,"16:00–24:00, 00:00–06:00"]));
  return { ...RULE_DEFAULT };
}
function getEffectiveJadwal(s){ return s?.jadwal && Object.keys(s.jadwal).length ? s.jadwal : buildRuleJadwal(s); }
const toMin = (s)=>{ const [h,m]=String(s).split(":").map((n)=>parseInt(n,10)||0); return h*60+m; };
function parseRanges(v){ const t=String(v||""); if(t.toLowerCase().includes("tutup")) return []; return t.split(",").map((r)=>r.trim().replace(/–|—/g,"-")); }
function rangesForToday(j,ref=new Date()){
  const d=ref.getDay(), day=DAY_NAMES_ID[d], prev=DAY_NAMES_ID[(d+6)%7];
  const today=parseRanges(j[day]), yesterday=parseRanges(j[prev]); const out=[];
  const push=(r,label)=>{ const [a,b]=r.split("-").map((s)=>s.trim()); if(!a||!b) return; const A=toMin(a),B=toMin(b);
    if(B>=A) out.push({from:A,to:B}); else { if(label==="yesterday") out.push({from:0,to:B}); else out.push({from:A,to:1440}); } };
  yesterday.forEach((r)=>push(r,"yesterday")); today.forEach((r)=>push(r,"today")); return out;
}
function isOpenNow(s, ref=new Date()){ const j=getEffectiveJadwal(s); const now=ref.getHours()*60+ref.getMinutes(); return rangesForToday(j,ref).some((R)=>now>=R.from && now<=R.to); }

/* ===================== Data Fasilitas ===================== */
const FACILITIES = [
  { id: "pkm-jagakarsa", name: "Puskesmas Jagakarsa" },
  { id: "pustu-jagakarsa-1", name: "Pustu Jagakarsa 1" },
  { id: "pustu-jagakarsa-2", name: "Pustu Jagakarsa 2" },
  { id: "pustu-ciganjur", name: "Pustu Ciganjur" },
  { id: "pustu-srensawah", name: "Pustu Srengseng Sawah" },
  { id: "pustu-lenteng-1", name: "Pustu Lenteng Agung 1" },
  { id: "pustu-lenteng-2", name: "Pustu Lenteng Agung 2" },
  { id: "pustu-tanjung-barat", name: "Pustu Tanjung Barat" },
];

/* ===================== Dataset Layanan Jagakarsa ===================== */
const SERVICES_JAGAKARSA = [
  {
    id: "poli-umum",
    nama: "Poli Umum",
    klaster: "Pelayanan Medik",
    ikon: "🩺",
    lokasi: "Lantai 1 — Ruang 101",
    telemed: true,
    img: "poli-umum.jpg.png",
    layanan: [
      { nama: "Pemeriksaan Umum", ikon: "🩺", tarif: 0, bpjs: true,  ket: "Konsultasi dokter umum", alur: [1,5] },
      { nama: "Kontrol Berkala",   ikon: "📅", tarif: 0, bpjs: true,  ket: "Kontrol kondisi pasien",  alur: [1,5] },
      { nama: "Surat Keterangan Sehat", ikon: "📝", tarif: 15000, bpjs: false, ket: "Dokumen administrasi sesuai kebutuhan", alur: [1,2,5] },
    ],
  },
  {
    id: "poli-gigi",
    nama: "Poli Gigi",
    klaster: "Pelayanan Medik",
    ikon: "🦷",
    lokasi: "Lantai 1 — Ruang 103",
    telemed: false,
    img: "poli-gigi.jpg",
    layanan: [
      { nama: "Cabut Gigi", ikon: "🦷", tarif: 30000, bpjs: true,  ket: "Tindakan pencabutan gigi permanen", alur: [1,2,3,4,5] },
      { nama: "Scaling (Pembersihan Karang)", ikon: "🪥", tarif: 40000, bpjs: false, ket: "Perawatan kebersihan gigi dan mulut", alur: [1,3,4,5] },
    ],
  },
  {
    id: "pelayanan-24-jam",
    nama: "Pelayanan 24 Jam",
    klaster: "Layanan Malam",
    ikon: "🌙",
    lokasi: "Lantai 1 — Layanan 24 Jam",
    telemed: false,
    img: "igd.jpg",
    layanan: [
      { nama: "Pelayanan Malam", ikon: "🌙", tarif: 0, bpjs: true, ket: "Layanan medis malam hari", alur: [1,5] },
    ],
  },
  {
    id: "igd",
    nama: "IGD",
    klaster: "Gawat Darurat",
    ikon: "🚑",
    lokasi: "Lantai Dasar — IGD",
    telemed: false,
    img: "igd.jpg",
    layanan: [
      { nama: "Tindakan Darurat", ikon: "⚡", tarif: 0, bpjs: true, ket: "Penanganan kegawatdaruratan", alur: [1,5] },
    ],
  },
];

/* ===================== Template Pustu (dummy) ===================== */
const makePustuServices = (label) => [
  {
    id: `${label}-umum`,
    nama: "Poli Umum",
    klaster: "Pelayanan Medik",
    ikon: "🩺",
    lokasi: "Ruang Poli Umum",
    telemed: false,
    img: "poli-umum.jpg.png",
    layanan: [{ nama: "Pemeriksaan Umum", ikon: "🩺", tarif: 0, bpjs: true, alur: [1,5] }],
  },
  {
    id: `${label}-gigi`,
    nama: "Poli Gigi",
    klaster: "Pelayanan Medik",
    ikon: "🦷",
    lokasi: "Ruang Poli Gigi",
    telemed: false,
    img: "poli-gigi.jpg",
    layanan: [
      { nama: "Cabut Gigi", ikon: "🦷", tarif: 30000, bpjs: true,  alur: [1,2,3,4,5] },
      { nama: "Scaling",    ikon: "🪥", tarif: 40000, bpjs: false, alur: [1,3,4,5] },
    ],
  },
];

/* ===================== Doctors & Extra Info ===================== */
const DOCTORS_BY_POLI = {
  "poli-umum": "dr. Natasha Adjani",
  "poli-gigi": "drg. Liza Noah Febriana Marpaung",
  "pelayanan-24-jam": "dr. Alfred Alberta Josua Ritonga",
  "igd": "dr. Ranu Brata Kusuma",
};
const EXTRA_INFO = {
  "Pemeriksaan Umum":"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer dignissim, nisi at tincidunt cursus, urna nibh dictum risus.",
  "Kontrol Berkala":"Lorem ipsum dolor sit amet consectetur adipisicing elit. Exercitationem, laboriosam. Catatan pra-kunjungan dan riwayat obat disarankan.",
  "Surat Keterangan Sehat":"Lorem ipsum dolor sit amet. Bawa identitas asli dan persyaratan administrasi sesuai ketentuan.",
  "Cabut Gigi":"Lorem ipsum dolor sit amet, consectetur. Harap informasikan riwayat alergi dan obat pengencer darah bila ada.",
  "Scaling (Pembersihan Karang)":"Lorem ipsum dolor sit amet. Anjuran kontrol kebersihan gigi dan mulut setelah tindakan.",
  "Tindakan Darurat":"Lorem ipsum dolor sit amet. Prioritas keselamatan pasien; ikuti instruksi petugas IGD.",
  "Pelayanan Malam":"Lorem ipsum dolor sit amet. Layanan tersedia pada jam malam; ikuti arahan petugas jaga.",
};

/* ===================== Services Map per Facility ===================== */
const SERVICES_BY_FACILITY = {
  "pkm-jagakarsa": SERVICES_JAGAKARSA,
  "pustu-jagakarsa-1": makePustuServices("pustu-jag1"),
  "pustu-jagakarsa-2": makePustuServices("pustu-jag2"),
  "pustu-ciganjur": makePustuServices("pustu-ciganjur"),
  "pustu-srensawah": makePustuServices("pustu-srensawah"),
  "pustu-lenteng-1": makePustuServices("pustu-lenteng1"),
  "pustu-lenteng-2": makePustuServices("pustu-lenteng2"),
  "pustu-tanjung-barat": makePustuServices("pustu-tjbrt"),
};

/* ===================== UI kecil ===================== */
const Chip = ({ children }) => (
  <span className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 whitespace-nowrap">{children}</span>
);

/* Pills: BPJS & Harga (Gratis/Rp) */
function Pill({ children, tone = "emerald" }) {
  const tones = {
    emerald: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30",
    sky:     "bg-sky-500/15     text-sky-300     ring-1 ring-sky-400/30",
    slate:   "bg-white/8        text-white/80    ring-1 ring-white/12",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold tracking-tight ${tones[tone]}`}>
      {children}
    </span>
  );
}
function PricePill({ tarif }) {
  const n = Number(tarif || 0);
  return n === 0 ? <Pill tone="emerald">Gratis</Pill> : <Pill tone="sky">Rp {n.toLocaleString("id-ID")}</Pill>;
}
const StatusPill = ({ open }) => (
  <span className={`ml-auto text-[11px] px-2 py-1 rounded-full border ${open?"bg-emerald-500/10 border-emerald-400/30 text-emerald-300":"bg-rose-500/10 border-rose-400/30 text-rose-300"}`}>{open?"Buka":"Tutup"}</span>
);

/* ===================== Sidebar ===================== */
function Sidebar({ facilityName, query, setQuery, services, onPick, selected, highlightIds = [] }) {
  const [expandedId, setExpandedId] = useState(null);
  const toggle = (s) => { onPick(s); setExpandedId((id) => (id === s.id ? null : s.id)); };

  return (
    <aside className="w-full md:w-80 shrink-0 bg-slate-950/70 backdrop-blur border-r border-white/10 flex flex-col">
      <div className="p-4 flex items-center gap-2 border-b border-white/10">
        <div className="size-8 rounded-xl bg-emerald-600 grid place-items-center">🏥</div>
        <div className="font-semibold truncate">Jadwal & Tarif</div>
      </div>

      <div className="px-4 pt-3 text-xs text-white/60">Fasilitas: <span className="text-white/90 font-medium">{facilityName}</span></div>

      <div className="p-4 space-y-3">
        <label className="text-xs uppercase text-white/50">Pencarian</label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari 'umum', 'gigi', 'cabut gigi' ..."
          className="w-full h-11 px-3 rounded-xl bg-white/5 border border-white/10 outline-none focus:ring-2 focus:ring-emerald-500 text-[15px]"
        />
      </div>

      <div className="px-4 pb-2 flex-1 overflow-y-auto space-y-2">
        <div className="text-xs uppercase text-white/50 mb-2">Daftar Poli</div>
        {services.map((s) => {
          const active = expandedId === s.id;
          const hl = highlightIds.includes(s.id);
          return (
            <div key={s.id} className="space-y-2">
              <button
                onClick={() => toggle(s)}
                className={`group w-full text-left p-3 rounded-xl border transition hover:bg-white/5 ${
                  selected?.id === s.id ? "border-emerald-500/60 bg-emerald-500/10"
                  : hl ? "border-emerald-400 bg-emerald-400/10"
                  : "border-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-lg">{s.ikon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{s.nama}</div>
                    <div className="text-xs text-white/60 truncate">{s.klaster}</div>
                  </div>
                  <StatusPill open={isOpenNow(s)} />
                </div>
              </button>

              {active && (
                <div className="mx-2 mb-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                  <div className="text-white/60 mb-1">Jadwal</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px] text-white/70">
                    {DAY_NAMES_ID.map((d) => (
                      <React.Fragment key={d}>
                        <span className="text-white/50">{d}</span>
                        <span>{getEffectiveJadwal(s)[d] || "Tutup"}</span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

/* ===================== Cards ===================== */
function ServiceCard({ s, onPick }) {
  return (
    <button onClick={() => onPick(s)} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-left">
      <div className="aspect-[4/3] sm:aspect-[16/9] w-full overflow-hidden">
        <img src={resolveInfografis(s)} onError={onInfoError} alt={s.nama} className="w-full h-full object-cover" />
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

/* Pill-only meta (BPJS + Harga) & SubServiceCard */
function SubServiceCard({ item, onPick }) {
  return (
    <button
      onClick={() => onPick(item)}
      className="relative w-full text-left rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition overflow-hidden"
    >
      {/* meta kanan-atas */}
      <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1.5">
        {item.bpjs && <Pill tone="emerald">BPJS</Pill>}
        <PricePill tarif={item.tarif} />
      </div>

      {/* ruang kanan agar tidak menabrak meta */}
      <div className="p-4 sm:p-5 pr-28 sm:pr-32 min-h-[120px] sm:min-h-[132px]">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-xl sm:text-2xl shrink-0">{item.ikon ?? "🧩"}</div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-[15px] sm:text-[16px] leading-snug text-white">{item.nama}</div>
            {item.ket && <div className="text-[13px] sm:text-sm text-white/70 mt-1">{item.ket}</div>}
          </div>
        </div>
      </div>
    </button>
  );
}

/* ===================== Flow Card ===================== */
function FlowCard({ code, index }) {
  const src = resolveFlowImg(code);
  const NARRATION_MAP = { 1:"alur-loket.mp3" /*, 2:"alur-kasir.mp3", 3:"alur-poli-gigi.mp3", 4:"alur-farmasi.mp3", 5:"alur-selesai.mp3"*/ };

  let lastTap = 0;
  const playNarration = () => {
    const file = NARRATION_MAP[code]; if (!file) return;
    const player = getFlowAudio(); const key = code; const url = `${import.meta.env.BASE_URL}voices/${file}`;
    const now = Date.now(); const isDoubleTap = now - lastTap < 400; lastTap = now;

    if (window.__flowAudioKey === key && isDoubleTap) { try { player.pause(); player.currentTime = 0; player.play(); } catch {} return; }
    try {
      player.pause(); player.currentTime = 0;
      if (window.__flowAudioKey !== key || player.src !== new URL(url, location.href).href) player.src = url;
      window.__flowAudioKey = key; player.play().catch(()=>{});
    } catch (e) { console.warn("Gagal memutar audio:", e); }
  };

  return (
    <button type="button" onClick={playNarration}
      className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden text-left hover:bg-white/10 transition focus:outline-none focus:ring-2 focus:ring-emerald-500"
      aria-label={`Langkah ${index + 1} — ketuk untuk narasi, ketuk cepat 2x untuk ulang`}>
      <div className="px-3 pt-2 text-[11px] text-white/50">Langkah {index + 1}</div>
      <div className="p-2 sm:p-3 flex items-center justify-center">
        {src ? (<img src={src} onError={onFlowError} alt={`Langkah ${index + 1}`} className="max-w-full h-auto object-contain" />)
             : (<div className="w-full aspect-[4/3] grid place-items-center text-white/30 text-sm">—</div>)}
      </div>
    </button>
  );
}

/* ===================== Info Card ===================== */
function InfoCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
      <div className="text-sm uppercase tracking-wide text-white/60 mb-2">{title}</div>
      <div className="prose prose-invert max-w-none text-sm leading-relaxed">{children}</div>
    </div>
  );
}

/* ===================== Right Panel ===================== */
function RightPanel({ selected, setSelected, filtered, subMatches, onPickSub, jump, setJump, searchQuery }) {
  const [sub, setSub] = useState(null);

  useEffect(()=>setSub(null), [selected]);
  useEffect(()=>{
    if (jump && selected && selected.id === jump.poliId) { setSub(selected.layanan?.[jump.idx] ?? null); setJump(null); }
  }, [jump, selected, setJump]);

  // Prioritas: saat ada query dengan hasil → tampilkan hasil layanan global,
  // meskipun sebelumnya ada poli yang terpilih.
  const showSearchResults = (searchQuery?.trim()?.length > 0) && (subMatches?.length > 0);

  if (!selected || showSearchResults) {
    return (
      <div className="min-h-[calc(100svh-64px)] p-3 sm:p-4 md:p-6">
        <AnimatePresence mode="wait">
          <motion.div key="grid-poli-or-search" initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:20}} transition={{duration:0.25}}>
            {showSearchResults ? (
              <section className="mb-6">
                <div className="mb-2 text-white/70">Hasil Pelayanan</div>
                <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {subMatches.map(({ poli, item, index }) => (
                    <SubServiceCard
                      key={poli.id + "#" + index}
                      item={{ ...item, nama: `${item.nama} — ${poli.nama}` }}
                      onPick={() => onPickSub(poli.id, index)}
                    />
                  ))}
                </div>
              </section>
            ) : (
              <>
                <div className="mb-3 text-white/70">Pilih poli untuk melihat jenis layanannya.</div>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filtered.map((s) => (<ServiceCard key={s.id} s={s} onPick={setSelected} />))}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  if (!sub) {
    const list = selected.layanan ?? [];
    return (
      <div className="min-h-[calc(100svh-64px)] p-3 sm:p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={()=>{ stopFlowAudio(); setSelected(null); }} className="px-3 py-2.5 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20">← Kembali</button>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-2xl">{selected.ikon}</div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-semibold">{selected.nama}</h2>
          <div className="ml-auto flex gap-2">
            <Chip>{selected.klaster}</Chip>
            {selected.telemed && <Chip>Telemed</Chip>}
          </div>
        </div>

        <div className="mb-1 text-white/70">Jenis Layanan — {selected.nama}</div>
        <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.length > 0
            ? list.map((it, i) => <SubServiceCard key={i} item={it} onPick={setSub} />)
            : <div className="text-white/60">Belum ada jenis layanan terdaftar.</div>}
        </div>
      </div>
    );
  }

  const steps = Array.from({ length: 9 }, (_, i) => sub.alur?.[i] ?? 0);
  const visibleSteps = steps.filter((code) => code && code !== 0);

  return (
    <div className="min-h-[calc(100svh-64px)] p-3 sm:p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={()=>{ stopFlowAudio(); setSub(null); }} className="px-3 py-2.5 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20">← Kembali</button>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-2xl">{selected.ikon}</div>
        <h2 className="text-lg sm:text-xl md:text-2xl font-semibold">{selected.nama} — {sub.nama}</h2>
        <div className="ml-auto flex gap-2">
          <Chip>{selected.klaster}</Chip>
          {selected.telemed && <Chip>Telemed</Chip>}
        </div>
      </div>

      <div className="text-white/70">Alur layanan untuk: <span className="font-medium">{sub.nama}</span></div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {visibleSteps.map((code, i) => (<FlowCard key={i} code={code} index={i} />))}
      </div>

      {/* Info dokter + detail layanan */}
      <div className="mt-4 sm:mt-6">
        <InfoCard title="Dokter Penanggung Jawab">
          <div className="font-semibold text-white mb-1">{DOCTORS_BY_POLI[selected.id] ?? "—"}</div>
          <div className="text-white/70">
            <p className="mb-2"><strong>Detail layanan:</strong> {sub.nama}</p>
            <p>{EXTRA_INFO[sub.nama] ?? "Informasi tambahan belum tersedia. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer dignissim, nisi at tincidunt cursus, urna nibh dictum risus."}</p>
            <p className="mt-2">Informasi ini bersifat contoh/dummy. Silakan ganti dengan ketentuan, persyaratan, atau instruksi khusus untuk layanan <em>{sub.nama}</em>.</p>
          </div>
        </InfoCard>
      </div>
    </div>
  );
}

/* ===================== App Root ===================== */
export default function App() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [facility, setFacility] = useState("pkm-jagakarsa");

  const SERVICES_CURRENT = SERVICES_BY_FACILITY[facility] || [];
  const facilityName = FACILITIES.find((f) => f.id === facility)?.name || "-";

  // reset pilihan poli saat user mulai mengetik agar hasil pencarian muncul
  useEffect(() => {
    if (query.trim().length > 0) {
      setSelected(null);
      stopFlowAudio();
    }
  }, [query]);

  // filter poli (judul/klaster)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SERVICES_CURRENT.filter(
      (s) => !q || s.nama.toLowerCase().includes(q) || s.klaster.toLowerCase().includes(q)
    );
  }, [query, SERVICES_CURRENT]);

  // hasil pencarian untuk sub-layanan (nama/ket)
  const subResults = useMemo(() => {
    const q = query.trim().toLowerCase(); if (!q) return [];
    const rows = [];
    SERVICES_CURRENT.forEach((p) => (p.layanan || []).forEach((item, idx) => {
      const hay = `${(item.nama || "").toLowerCase()} ${(item.ket || "").toLowerCase()}`;
      if (hay.includes(q)) rows.push({ poli: p, item, index: idx });
    }));
    return rows;
  }, [query, SERVICES_CURRENT]);

  const matchPoliIds = useMemo(() => Array.from(new Set(subResults.map((r) => r.poli.id))), [subResults]);
  const sidebarList = useMemo(
    () => (filtered.length === 0 && query && subResults.length > 0 ? SERVICES_CURRENT : filtered),
    [filtered, query, subResults, SERVICES_CURRENT]
  );

  // loncat otomatis ke sub-layanan
  const [jump, setJump] = useState(null);
  function handlePickSub(poliId, idx){
    const p = SERVICES_CURRENT.find((x) => x.id === poliId); if (!p) return;
    setSelected(p); setJump({ poliId, idx });
  }

  // reset saat ganti fasilitas
  useEffect(()=>{ stopFlowAudio(); setSelected(null); setQuery(""); }, [facility]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white">
      <header className="sticky top-0 z-30 backdrop-blur bg-slate-900/70 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-emerald-600 grid place-items-center">🏥</div>
            <div className="font-semibold">Penampil Jadwal & Tarif Layanan</div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <label className="text-xs text-white/60 hidden sm:block">Fasilitas</label>
            <select value={facility} onChange={(e)=>setFacility(e.target.value)} className="h-9 rounded-lg bg-white/5 border border-white/10 px-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500">
              {FACILITIES.map((f) => (<option key={f.id} value={f.id}>{f.name}</option>))}
            </select>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-0 md:px-4 grid md:grid-cols-[24rem_1fr]">
        <Sidebar
          facilityName={facilityName}
          query={query}
          setQuery={setQuery}
          services={sidebarList}
          onPick={(s)=>setSelected(s)}
          selected={selected}
          highlightIds={matchPoliIds}
        />
        <RightPanel
          selected={selected}
          setSelected={setSelected}
          filtered={filtered}
          subMatches={subResults}
          onPickSub={handlePickSub}
          jump={jump}
          setJump={setJump}
          searchQuery={query}
        />
      </div>

      <footer className="py-6 text-center text-white/50 text-sm">© {new Date().getFullYear()} Puskesmas Jagakarsa — Mockup UI.</footer>
    </div>
  );
}
