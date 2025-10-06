// src/data/services.js

/* =========================================================
   Kamus Langkah Global (skalabel & reusable)
   - Gunakan angka 1..N sebagai key (ringkas di data layanan)
   - Setiap langkah punya judul, nama, deskripsi, (opsional) img/audio
   ========================================================= */
export const FLOW_STEPS = {
  1: {
    id: 1,
    title: "Langkah 1",
    name: "Daftar / Loket",
    description:
      "Silahkan mendaftar di loket/pendaftaran. Serahkan identitas atau kartu BPJS bila ada.",
    img: "/alur/1-menuju-loket.jpg", 
    audio: "/voices/alur-loket.mp3" 
  },
  2: {
    id: 2,
    title: "Langkah 2",
    name: "Menuju Kasir",
    description:
      "Silahkan menuju kasir lantai 3 untuk membayar biaya administrasi/ layanan",
    img: "/alur/2-menuju-kasir.jpg"
  },
  3: {
    id: 3,
    title: "Langkah 3",
    name: "Menuju Poli Gigi",
    description:
      "Silahkan menuju poli gigi lantai 2",
    img: "/alur/3-menuju-poli-gigi.jpg"
  },
  4: {
    id: 4,
    title: "Langkah 4",
    name: "Menuju Farmasi",
    description:
      "Ambil obat sesuai resep di unit farmasi lantai 1. Ikuti petunjuk penggunaan obat",
    img: "/alur/4-menuju-farmasi.jpg"
  },
  5: {
    id: 5,
    title: "Langkah 5",
    name: "Selesai / Pulang",
    description:
      "Layanan selesai. Pasien boleh pulang atau mendapat instruksi kontrol berikutnya.",
    img: "/alur/5-selesai.jpg"
  },
  6: {
    id: 6,
    title: "Langkah 6",
    name: "Menuju Poli Umum",
    description:
      "Silahkan menuju poli umum lantai 2 dan tunggu panggilan",
    img: "/alur/6-menuju-ke-poli-umum.jpg"
  },
  7: {
    id: 7,
    title: "Langkah 7",
    name: "Menuju Laboratorium",
    description:
      "Silahkan menuju laboratorium lantai 3 lalu taruh kertas antrian di box yang tersedia, tunggu panggilan",
    img: "/alur/7-menuju-laboratorium.jpg"
  },
  8: {
    id: 8,
    title: "Langkah 8",
    name: "Menunggu Hasil Lab",
    description:
      "Silahkan menunggu hasil lab sesuai waktu tunggu pemeriksaan",
    img: "/alur/8-menunggu-hasil-lab.jpg"
  },
  // Kamu bisa tambah 6,7,... tanpa ubah struktur layanan
};

/* ===================== Daftar Fasilitas ===================== */
export const FACILITIES = [
  { id: "pkm-jagakarsa", name: "Puskesmas Jagakarsa" },
  { id: "pkm-lain", name: "Puskesmas Lain (contoh)" },
];

/* ===================== Data Poli/Layanan ===================== */
/* Tetap ringkas: alur tetap pakai angka [1,2] / [1,3,4,5], dst. */
export const SERVICES_BY_FACILITY = {
  "pkm-jagakarsa": [
    {
      id: "poli-umum",
      nama: "Poli Umum",
      klaster: "Pelayanan Medik",
      ikon: "🩺",
      lokasi: "Lantai 1 — Ruang 101",
      telemed: true,
      img: "poli-umum.jpg.png",
      layanan: [
        { nama: "Pemeriksaan Umum", ikon: "🩺", tarif: 0, bpjs: true, ket: "Konsultasi dokter umum", alur: [1, 6, 5] },
        { nama: "Kontrol Berkala",   ikon: "📅", tarif: 0, bpjs: true, ket: "Kontrol kondisi pasien", alur: [1, 6, 5] },
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
        { nama: "Cabut Gigi", ikon: "🦷", tarif: 30000, bpjs: true,  ket: "Pencabutan gigi permanen", alur: [1, 3, 4, 5] },
        { nama: "Scaling",   ikon: "🪥", tarif: 40000, bpjs: false, ket: "Pembersihan karang gigi",   alur: [1, 3, 4, 5] },
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
        { nama: "Tindakan Darurat", ikon: "⚡", tarif: 0, bpjs: true, ket: "Penanganan kegawatdaruratan", alur: [1, 5] },
      ],
    },
    {
      id: "pelayanan-24",
      nama: "Pelayanan 24 Jam",
      klaster: "Layanan Medik",
      ikon: "🚑",
      lokasi: "Lantai Dasar — IGD",
      telemed: false,
      img: "igd.jpg",
      layanan: [
        { nama: "Layanan 24 jam", ikon: "⚡", tarif: 0, bpjs: true, ket: "Pelayanan Umum 24 Jam", alur: [1, 5] },
      ],
    },

    // 🔹 Kebidanan & Anak
    { id: "ki-hamil", nama: "KI Hamil", klaster: "Kebidanan", ikon: "🤰", lokasi: "Poli KIA", telemed: false, img: "ki-hamil.jpg",
      layanan: [{ nama: "Pemeriksaan Ibu Hamil", ikon: "🤰", tarif: 0, bpjs: true, ket: "Antenatal care", alur: [1, 5] }] },
    { id: "ki-nifas", nama: "KI Nifas", klaster: "Kebidanan", ikon: "🍼", lokasi: "Poli KIA", telemed: false, img: "ki-nifas.jpg",
      layanan: [{ nama: "Pemeriksaan Ibu Nifas", ikon: "🍼", tarif: 0, bpjs: true, ket: "Pemantauan masa nifas", alur: [1, 5] }] },
    { id: "catin", nama: "Catin", klaster: "Kebidanan", ikon: "💍", lokasi: "Poli KIA", telemed: false, img: "catin.jpg",
      layanan: [{ nama: "Pemeriksaan Calon Pengantin", ikon: "💍", tarif: 0, bpjs: true, ket: "Skrining pranikah", alur: [1, 5] }] },
    { id: "imunisasi", nama: "Imunisasi", klaster: "Anak", ikon: "💉", lokasi: "Ruang Imunisasi", telemed: false, img: "imunisasi.jpg",
      layanan: [{ nama: "Imunisasi Dasar & Lanjutan", ikon: "💉", tarif: 0, bpjs: true, ket: "Sesuai jadwal nasional", alur: [1, 5] }] },
    { id: "kb-iva", nama: "KB & IVA", klaster: "Kebidanan", ikon: "👩‍⚕️", lokasi: "Poli KIA", telemed: false, img: "kb-iva.jpg",
      layanan: [{ nama: "Konseling KB & IVA", ikon: "👩‍⚕️", tarif: 0, bpjs: true, ket: "Sesuai kebutuhan", alur: [1, 5] }] },
    { id: "tumbang", nama: "Tumbang", klaster: "Anak", ikon: "🧒", lokasi: "Poli Anak", telemed: false, img: "tumbang.jpg",
      layanan: [{ nama: "Tumbuh Kembang Anak", ikon: "📈", tarif: 0, bpjs: true, ket: "Asesmen perkembangan anak", alur: [1, 5] }] },
    { id: "mtbs", nama: "MTBS", klaster: "Anak", ikon: "👶", lokasi: "Poli Anak", telemed: false, img: "mtbs.jpg",
      layanan: [{ nama: "Manajemen Terpadu Balita Sakit", ikon: "👶", tarif: 0, bpjs: true, ket: "Standar MTBS", alur: [1, 5] }] },

    // 🔹 Remaja & Lansia
    { id: "pkpr", nama: "PKPR", klaster: "Remaja", ikon: "🎒", lokasi: "Poli Remaja", telemed: false, img: "pkpr.jpg",
      layanan: [{ nama: "Pelayanan Kesehatan Peduli Remaja", ikon: "🎒", tarif: 0, bpjs: true, ket: "Konseling remaja", alur: [1, 5] }] },
    { id: "lansia", nama: "Lansia", klaster: "Lansia", ikon: "🧓", lokasi: "Poli Lansia", telemed: false, img: "lansia.jpg",
      layanan: [{ nama: "Pelayanan Kesehatan Lansia", ikon: "🧓", tarif: 0, bpjs: true, ket: "Skrining & kontrol", alur: [1, 5] }] },

    // 🔹 Penyakit Menular & Tidak Menular
    { id: "ptm", nama: "PTM", klaster: "Penyakit Tidak Menular", ikon: "❤️‍🩹", lokasi: "Poli PTM", telemed: false, img: "ptm.jpg",
      layanan: [{ nama: "Konsultasi PTM", ikon: "❤️‍🩹", tarif: 0, bpjs: true, ket: "Hipertensi, DM, dsb", alur: [1, 5] }] },
    { id: "pm", nama: "PM", klaster: "Penyakit Menular", ikon: "🧫", lokasi: "Poli PM", telemed: false, img: "pm.jpg",
      layanan: [{ nama: "Konsultasi Penyakit Menular", ikon: "🧫", tarif: 0, bpjs: true, ket: "TB, HIV, dsb", alur: [1, 5] }] },
    { id: "ims", nama: "IMS", klaster: "Penyakit Menular", ikon: "⚕️", lokasi: "Poli IMS", telemed: false, img: "ims.jpg",
      layanan: [{ nama: "Infeksi Menular Seksual", ikon: "⚕️", tarif: 0, bpjs: true, ket: "Terapi IMS", alur: [1, 5] }] },
    { id: "ispa", nama: "ISPA", klaster: "Penyakit Menular", ikon: "🫁", lokasi: "Poli ISPA", telemed: false, img: "ispa.jpg",
      layanan: [{ nama: "Infeksi Saluran Pernafasan Akut", ikon: "🫁", tarif: 0, bpjs: true, ket: "ISPA sesuai gejala", alur: [1, 5] }] },

    // 🔹 Lainnya
    { id: "mata", nama: "Mata", klaster: "Pelayanan Medik", ikon: "👁️", lokasi: "Poli Mata", telemed: false, img: "mata.jpg",
      layanan: [{ nama: "Pemeriksaan Mata", ikon: "👁️", tarif: 0, bpjs: true, ket: "Visus, refraksi dasar", alur: [1, 5] }] },
    { id: "gizi", nama: "Konsultasi Gizi", klaster: "Gizi", ikon: "🥗", lokasi: "Poli Gizi", telemed: true, img: "gizi.jpg",
      layanan: [{ nama: "Konseling Gizi", ikon: "🥗", tarif: 0, bpjs: true, ket: "Diet & nutrisi", alur: [1, 5] }] },
    { id: "akupresur", nama: "Akupresur", klaster: "Tradisional", ikon: "👐", lokasi: "Pelayanan Tradisional", telemed: false, img: "akupresur.jpg",
      layanan: [{ nama: "Terapi Akupresur", ikon: "👐", tarif: 20000, bpjs: false, ket: "Relaksasi & kesehatan", alur: [1, 2, 5] }] },
    { id: "kirana", nama: "KIRANA Konseling", klaster: "Konseling", ikon: "🧠", lokasi: "Unit Konseling", telemed: true, img: "kirana.jpg",
      layanan: [{ nama: "Konseling Psikososial", ikon: "🧠", tarif: 0, bpjs: true, ket: "Kesehatan mental & sosial", alur: [1, 5] }] },
    { id: "klinik-sanitasi", nama: "Klinik Sanitasi", klaster: "Sanitasi", ikon: "🧼", lokasi: "Klinik Sanitasi", telemed: false, img: "klinik-sanitasi.jpg",
      layanan: [{ nama: "Konsultasi Sanitasi", ikon: "🧼", tarif: 0, bpjs: true, ket: "Lingkungan & perilaku sehat", alur: [1, 5] }] },
    { id: "uks", nama: "UKS", klaster: "Sekolah", ikon: "🏫", lokasi: "Lintas Sekolah", telemed: false, img: "uks.jpg",
      layanan: [{ nama: "Usaha Kesehatan Sekolah", ikon: "🏫", tarif: 0, bpjs: true, ket: "Program UKS", alur: [1, 5] }] },
    { id: "vaksin-dengue", nama: "Vaksin Dengue", klaster: "Imunisasi", ikon: "🦟", lokasi: "Poli Vaksinasi", telemed: false, img: "vaksin-dengue.jpg",
      layanan: [{ nama: "Pemberian Vaksin Dengue", ikon: "🦟", tarif: 0, bpjs: true, ket: "Pencegahan DBD", alur: [1, 2, 5] }] },
  ],
};

/* ===================== Dokter Penanggung Jawab ===================== */
export const DOCTORS_BY_POLI = {
  "poli-umum": "dr. Umum",
  "poli-gigi": "drg. Gigi",
  "igd": "dr. IGD",
  "ki-hamil": "Bidan Ani",
  "ki-nifas": "Bidan Siti",
  "catin": "Bidan Dewi",
  "imunisasi": "Perawat Imunisasi",
  "kb-iva": "Bidan Tika",
  "tumbang": "dr. Anak",
  "mtbs": "dr. Balita",
  "pkpr": "dr. Remaja",
  "lansia": "dr. Lansia",
  "ptm": "dr. Penyakit Tidak Menular",
  "pm": "dr. Penyakit Menular",
  "ims": "dr. IMS",
  "ispa": "dr. ISPA",
  "mata": "dr. Mata",
  "gizi": "dr. Gizi",
  "akupresur": "Terapis Tradisional",
  "kirana": "Psikolog",
  "klinik-sanitasi": "Sanitarian",
  "uks": "Petugas UKS",
  "vaksin-dengue": "Perawat Vaksin",
};

/* ===================== Extra Info Dummy ===================== */
export const EXTRA_INFO = {
  "Pemeriksaan Umum": "Layanan pemeriksaan umum oleh dokter.",
  "Cabut Gigi": "Tindakan pencabutan gigi permanen.",
  "Scaling": "Pembersihan karang gigi.",
  "Tindakan Darurat": "Penanganan kasus gawat darurat.",
};
