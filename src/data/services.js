// src/data/services.js

/* =========================================================
   Kamus Langkah Global (reusable & skalabel)
   - Gunakan angka 1..N sebagai key.
   - Setiap langkah berisi judul, nama, deskripsi, (opsional) img/audio.
   - Gambar langkah diambil dari folder /public (gunakan path absolut).
   ========================================================= */
export const FLOW_STEPS = {
  1: {
    id: 1,
    title: "Langkah 1",
    name: "Daftar / Loket",
    description:
      "Silahkan mendaftar di loket/pendaftaran. Serahkan identitas atau kartu BPJS bila ada.",
    img: "/alur/1-menuju-loket.jpg",
    audio: "/voices/alur-loket.mp3", // audio tetap didefinisikan di data
  },
  2: {
    id: 2,
    title: "Langkah 2",
    name: "Menuju Kasir",
    description:
      "Silahkan menuju kasir lantai 3 untuk membayar biaya administrasi/ layanan.",
    img: "/alur/2-menuju-kasir.jpg",
  },
  3: {
    id: 3,
    title: "Langkah 3",
    name: "Menuju Poli Gigi",
    description: "Silahkan menuju poli gigi lantai 2.",
    img: "/alur/3-menuju-poli-gigi.jpg",
  },
  4: {
    id: 4,
    title: "Langkah 4",
    name: "Menuju Farmasi",
    description:
      "Ambil obat sesuai resep di unit farmasi lantai 1. Ikuti petunjuk penggunaan obat.",
    img: "/alur/4-menuju-farmasi.png",
  },
  5: {
    id: 5,
    title: "Langkah 5",
    name: "Selesai / Pulang",
    description:
      "Layanan selesai. Pasien boleh pulang atau mendapat instruksi kontrol berikutnya.",
    img: "/alur/5-selesai.jpg",
  },
  6: {
    id: 6,
    title: "Langkah 6",
    name: "Menuju Poli Umum",
    description: "Silahkan menuju poli umum lantai 2 (ruangan dibalik nurse station)dan tunggu panggilan.",
    img: "/alur/6-menuju-ke-poli-umum.jpg",
  },
  7: {
    id: 7,
    title: "Langkah 7",
    name: "Menuju Laboratorium",
    description:
      "Silahkan menuju laboratorium lantai 3 lalu taruh kertas antrian di box yang tersedia, tunggu panggilan.",
    img: "/alur/7-menuju-laboratorium.jpg",
  },
  8: {
    id: 8,
    title: "Langkah 8",
    name: "Menunggu Hasil Lab",
    description: "Silahkan menunggu hasil lab sesuai waktu tunggu pemeriksaan, jika ada resep obat, bisa diambil di farmasi lantai 1.",
    img: "/alur/8-menunggu-hasil-lab.jpg",
  },
  9: {
    id: 9,
    title: "Langkah 9",
    name: "Menuju Nurse Station Poli Umum",
    description: "Silahkan menuju nurse station poli umum di lantai 2 (di depan tangga) dan serahkan resi pendaftaran.",
    img: "/alur/9-menuju-nurse-station-poli-umum.png",
  },
  10: {
    id: 10,
    title: "Langkah 10",
    name: "Menuju Poli Umum Baca Hasil Lab",
    description: "Silahkan menuju poli umum lantai 2 untuk membaca hasil lab, serahkan hasil lab kepada perawat ruangan poli umum.",
    img: "/alur/6-menuju-ke-poli-umum.jpg",
    },
  // Tambahkan langkah baru (9, 10, dst.) tanpa mengubah struktur layanan.
};

/* ===================== Daftar Fasilitas ===================== */
export const FACILITIES = [
  { id: "pkm-jagakarsa", name: "Puskesmas Jagakarsa" },
  { id: "pkm-lain", name: "Puskesmas Lain (contoh)" },
];

/* =========================================================
   Data Poli / Layanan
   - Tetap ringkas: field `alur` berisi array ID langkah: [1, 6, 5], dst.
   - Gambar infografis poli diambil dari /public/infografis (lihat App.jsx).
   ========================================================= */
export const SERVICES_BY_FACILITY = {
  "pkm-jagakarsa": [
    {
      id: "poli-umum",
      nama: "Poli Umum",
      klaster: "Pelayanan Medik",
      ikon: "🩺",
      lokasi: "Lantai 1 — Ruang 101",
      telemed: true,
      img: "poli-umum.png",
      layanan: [
        {
          nama: "Pemeriksaan Dokter Umum",
          ikon: "🩺",
          tarif: 10000,
          bpjs: true,
          ket: "Pemeriksaan dokter umum",
          alur: {
            farmasi:        [1, 9, 6, 4, 5], // ambil obat
            pemeriksaan_laboratorium: [1, 9, 6, 7, 8, 10, 5], // ke Lab
            rujuk_luar:     [1, 9, 6, 5],    // rujuk RS
            },
        },
        {
          nama: "Kontrol Berkala",
          ikon: "📅",
          tarif: 10000,
          bpjs: true,
          ket: "Kontrol kondisi pasien",
          alur: [1, 6, 5],
        },
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
        {
          nama: "Cabut Gigi",
          ikon: "🦷",
          tarif: 30000,
          bpjs: true,
          ket: "Pencabutan gigi permanen",
          alur: [1, 3, 4, 5],
        },
        {
          nama: "Scaling",
          ikon: "🪥",
          tarif: 40000,
          bpjs: false,
          ket: "Pembersihan karang gigi",
          alur: [1, 3, 4, 5],
        },
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
        {
          nama: "Tindakan Darurat",
          ikon: "⚡",
          tarif: 0,
          bpjs: true,
          ket: "Penanganan kegawatdaruratan",
          alur: [1, 5],
        },
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
        {
          nama: "Layanan 24 jam",
          ikon: "⚡",
          tarif: 0,
          bpjs: true,
          ket: "Pelayanan Umum 24 Jam",
          alur: [1, 5],
        },
      ],
    },

    // 🔹 Kebidanan & Anak
    {
      id: "ki-hamil",
      nama: "KI Hamil",
      klaster: "Kebidanan",
      ikon: "🤰",
      lokasi: "Poli KIA",
      telemed: false,
      img: "ki-hamil.png",
      layanan: [
        {
          nama: "Pemeriksaan Ibu Hamil",
          ikon: "🤰",
          tarif: 0,
          bpjs: true,
          ket: "Antenatal care",
          alur: [1, 5],
        },
      ],
    },
    {
      id: "ki-nifas",
      nama: "KI Nifas",
      klaster: "Kebidanan",
      ikon: "🍼",
      lokasi: "Poli KIA",
      telemed: false,
      img: "ki-nifas.png",
      layanan: [
        {
          nama: "Pemeriksaan Ibu Nifas",
          ikon: "🍼",
          tarif: 0,
          bpjs: true,
          ket: "Pemantauan masa nifas",
          alur: [1, 5],
        },
      ],
    },
    {
      id: "catin",
      nama: "Catin",
      klaster: "Kebidanan",
      ikon: "💍",
      lokasi: "Poli KIA",
      telemed: false,
      img: "poli-catin.png",
      layanan: [
        {
          nama: "Pemeriksaan Calon Pengantin",
          ikon: "💍",
          tarif: 0,
          bpjs: true,
          ket: "Skrining pranikah",
          alur: [1, 5],
        },
      ],
    },
    {
      id: "imunisasi",
      nama: "Imunisasi",
      klaster: "Anak",
      ikon: "💉",
      lokasi: "Ruang Imunisasi",
      telemed: false,
      img: "poli-imunisasi.png",
      layanan: [
        {
          nama: "Imunisasi Dasar & Lanjutan",
          ikon: "💉",
          tarif: 0,
          bpjs: true,
          ket: "Sesuai jadwal nasional",
          alur: [1, 5],
        },
      ],
    },
    {
      id: "kb-iva",
      nama: "KB & IVA",
      klaster: "Kebidanan",
      ikon: "👩‍⚕️",
      lokasi: "Poli KIA",
      telemed: false,
      img: "poli-kb.png",
      layanan: [
        {
          nama: "Konseling KB & IVA",
          ikon: "👩‍⚕️",
          tarif: 0,
          bpjs: true,
          ket: "Sesuai kebutuhan",
          alur: [1, 5],
        },
      ],
    },
    {
      id: "tumbang",
      nama: "Tumbang",
      klaster: "Anak",
      ikon: "🧒",
      lokasi: "Poli Anak",
      telemed: false,
      img: "poli-tumbang.png",
      layanan: [
        {
          nama: "Konsultasi Tumbuh Kembang Anak",
          ikon: "📈",
          tarif: 15000,
          bpjs: true,
          ket: "Asesmen perkembangan anak",
          alur: [1, 5],
        },
      ],
    },
    {
      id: "mtbs",
      nama: "MTBS",
      klaster: "Anak",
      ikon: "👶",
      lokasi: "Poli Anak",
      telemed: false,
      img: "poli-mtbs.png",
      layanan: [
        {
          nama: "Manajemen Terpadu Balita Sakit",
          ikon: "👶",
          tarif: 0,
          bpjs: true,
          ket: "Standar MTBS",
          alur: [1, 5],
        },
      ],
    },

    // 🔹 Remaja & Lansia
    {
      id: "pkpr",
      nama: "PKPR",
      klaster: "Remaja",
      ikon: "🎒",
      lokasi: "Poli Remaja",
      telemed: false,
      img: "poli-pkpr.png",
      layanan: [
        {
          nama: "Pelayanan Kesehatan Peduli Remaja",
          ikon: "🎒",
          tarif: 0,
          bpjs: true,
          ket: "Konseling remaja",
          alur: [1, 5],
        },
      ],
    },
    {
      id: "lansia",
      nama: "Lansia",
      klaster: "Lansia",
      ikon: "🧓",
      lokasi: "Poli Lansia",
      telemed: false,
      img: "poli-lansia.png",
      layanan: [
        {
          nama: "Pelayanan Kesehatan Lansia",
          ikon: "🧓",
          tarif: 0,
          bpjs: true,
          ket: "Skrining & kontrol",
          alur: [1, 5],
        },
      ],
    },

    // 🔹 Penyakit Menular & Tidak Menular
    {
      id: "ptm",
      nama: "PTM",
      klaster: "Penyakit Tidak Menular",
      ikon: "❤️‍🩹",
      lokasi: "Poli PTM",
      telemed: false,
      img: "poli-ptm.png",
      layanan: [
        {
          nama: "Konsultasi PTM",
          ikon: "❤️‍🩹",
          tarif: 0,
          bpjs: true,
          ket: "Hipertensi, DM, dsb",
          alur: [1, 5],
        },
      ],
    },
    {
      id: "pm",
      nama: "PM",
      klaster: "Penyakit Menular",
      ikon: "🧫",
      lokasi: "Poli PM",
      telemed: false,
      img: "poli-pm.png",
      layanan: [
        {
          nama: "Konsultasi Penyakit Menular",
          ikon: "🧫",
          tarif: 0,
          bpjs: true,
          ket: "TB, HIV, dsb",
          alur: [1, 5],
        },
      ],
    },
    {
      id: "ims",
      nama: "IMS",
      klaster: "Penyakit Menular",
      ikon: "⚕️",
      lokasi: "Poli IMS",
      telemed: false,
      img: "poli-ims.png",
      layanan: [
        {
          nama: "Infeksi Menular Seksual",
          ikon: "⚕️",
          tarif: 0,
          bpjs: true,
          ket: "Terapi IMS",
          alur: [1, 5],
        },
      ],
    },
    {
      id: "ispa",
      nama: "ISPA",
      klaster: "Penyakit Menular",
      ikon: "🫁",
      lokasi: "Poli ISPA",
      telemed: false,
      img: "poli-pm.png",
      layanan: [
        {
          nama: "Infeksi Saluran Pernafasan Akut",
          ikon: "🫁",
          tarif: 0,
          bpjs: true,
          ket: "ISPA sesuai gejala",
          alur: [1, 5],
        },
      ],
    },

    // 🔹 Lainnya
    {
      id: "mata",
      nama: "Mata",
      klaster: "Pelayanan Medik",
      ikon: "👁️",
      lokasi: "Poli Mata",
      telemed: false,
      img: "poli-mata.png",
      layanan: [
        {
          nama: "Pemeriksaan Mata",
          ikon: "👁️",
          tarif: 0,
          bpjs: true,
          ket: "Visus, refraksi dasar",
          alur: [1, 5],
        },
      ],
    },
    {
      id: "gizi",
      nama: "Konsultasi Gizi",
      klaster: "Gizi",
      ikon: "🥗",
      lokasi: "Poli Gizi",
      telemed: true,
      img: "poli-gizi.png",
      layanan: [
        {
          nama: "Konseling Gizi",
          ikon: "🥗",
          tarif: 0,
          bpjs: true,
          ket: "Diet & nutrisi",
          alur: [1, 5],
        },
      ],
    },
    {
      id: "kirana",
      nama: "KIRANA Konseling",
      klaster: "Konseling",
      ikon: "🧠",
      lokasi: "Unit Konseling",
      telemed: true,
      img: "poli-kirana.png",
      layanan: [
        {
          nama: "Konseling Psikososial",
          ikon: "🧠",
          tarif: 0,
          bpjs: true,
          ket: "Kesehatan mental & sosial",
          alur: [1, 5],
        },
      ],
    },
    {
      id: "kesling_surveilans",
      nama: "Kesehatan Lingkungan & Surveilans",
      klaster: "Kesling & Surveilans",
      ikon: "🧼",
      lokasi: "Kesehatan Lingkungan & Surveilans",
      telemed: false,
      img: "kesehatan-lingkungan.png",
      layanan: [
        {
          nama: "Klinik Sanitasi",
          ikon: "🧼",
          tarif: 0,
          bpjs: true,
          ket: "Lingkungan & perilaku sehat",
          alur: [1, 5],
        },
        {
          nama: "Laporan DBD & Cikungunya",
          ikon: "🦟",
          tarif: 0,
          bpjs: true,
          ket: "Lingkungan & perilaku sehat",
          alur: [1, 5],
        },
        {
          nama: "Laporan Kematian Jenazah Sudah Dikuburkan",
          ikon: "⚰️",
          tarif: 0,
          bpjs: false,
          ket: "Lingkungan & perilaku sehat",
          alur: [1, 5],
        },
        {
          nama: "Laporan Kematian Jenazah Belum Dikuburkan",
          ikon: "⚰️",
          tarif: 30000,
          bpjs: false,
          ket: "Lingkungan & perilaku sehat",
          alur: [1, 5],
        },
        {
          nama: "Laporan Penyakit Potensi KLB/ Wabah Difteri",
          ikon: "🦠",
          tarif: 0,
          bpjs: false,
          ket: "Lingkungan & perilaku sehat",
          alur: [1, 5],
        },
         {
          nama: "Laporan Penyakit Potensi KLB/ Wabah Pertusis (Batuk Rejan)",
          ikon: "🦠",
          tarif: 0,
          bpjs: false,
          ket: "Lingkungan & perilaku sehat",
          alur: [1, 5],
        },
         {
          nama: "Laporan Penyakit Potensi KLB/ Wabah Campak",
          ikon: "🦠",
          tarif: 0,
          bpjs: false,
          ket: "Lingkungan & perilaku sehat",
          alur: [1, 5],
        },
         {
          nama: "Laporan Penyakit Potensi KLB/ Wabah Lumpuh Layu (Polio)",
          ikon: "🦠",
          tarif: 0,
          bpjs: false,
          ket: "Lingkungan & perilaku sehat",
          alur: [1, 5],
        },
         {
          nama: "Laporan Keracunan Pangan",
          ikon: "🦠",
          tarif: 0,
          bpjs: false,
          ket: "Lingkungan & perilaku sehat",
          alur: [1, 5],
        },
      ],
    },
    {
      id: "uks",
      nama: "UKS",
      klaster: "Sekolah",
      ikon: "🏫",
      lokasi: "Lintas Sekolah",
      telemed: false,
      img: "uks.jpg",
      layanan: [
        {
          nama: "Usaha Kesehatan Sekolah",
          ikon: "🏫",
          tarif: 0,
          bpjs: true,
          ket: "Program UKS",
          alur: [1, 5],
        },
      ],
    },
    {
      id: "vaksin-dengue",
      nama: "Vaksin Dengue",
      klaster: "Imunisasi",
      ikon: "🦟",
      lokasi: "Poli Vaksinasi",
      telemed: false,
      img: "vaksin-dengue.jpg",
      layanan: [
        {
          nama: "Pemberian Vaksin Dengue",
          ikon: "🦟",
          tarif: 0,
          bpjs: true,
          ket: "Pencegahan DBD",
          alur: [1, 2, 5],
        },
      ],
    },
  ],
};

/* ===================== Petugas Penanggung Jawab ===================== */
export const DOCTORS_BY_POLI = {
  "poli-umum": "dr. Natasha Adjani",
  "poli-gigi": "drg. Gigi",
  igd: "dr. IGD",
  "ki-hamil": "Bidan Ani",
  "ki-nifas": "Bidan Siti",
  catin: "Bidan Dewi",
  imunisasi: "Perawat Imunisasi",
  "kb-iva": "Bidan Tika",
  tumbang: "dr. Anak",
  mtbs: "dr. Balita",
  pkpr: "dr. Remaja",
  lansia: "dr. Lansia",
  ptm: "dr. Penyakit Tidak Menular",
  pm: "dr. Penyakit Menular",
  ims: "dr. IMS",
  ispa: "dr. ISPA",
  mata: "dr. Mata",
  gizi: "dr. Gizi",
  kirana: "Psikolog",
  "klinik-sanitasi": "Sanitarian",
  uks: "Petugas UKS",
  "vaksin-dengue": "Perawat Vaksin",
  "kesling_surveilans": "Dwitania Manvi, S.K.M.,",
};

/* ===================== Info Tambahan (contoh) ===================== */
export const EXTRA_INFO = {
  // Poli Umum
  "Pemeriksaan Umum": "Informasi tambahan belum tersedia.",
  "Kontrol Berkala": "Informasi tambahan belum tersedia.",

  // Poli Gigi
  "Cabut Gigi": "Informasi tambahan belum tersedia.",
  "Scaling": "Informasi tambahan belum tersedia.",

  // IGD
  "Tindakan Darurat": "Informasi tambahan belum tersedia.",

  // KB & IVA
  "Konseling KB": "Informasi tambahan belum tersedia.",
  "Pemeriksaan IVA": "Informasi tambahan belum tersedia.",

  // Tumbang
  "Pemeriksaan Tumbuh Kembang": "Informasi tambahan belum tersedia.",

  // MTBS
  "Pemeriksaan Balita Sakit": "Informasi tambahan belum tersedia.",

  // PKPR
  "Konseling Remaja": "Informasi tambahan belum tersedia.",

  // Lansia
  "Pemeriksaan Lansia": "Informasi tambahan belum tersedia.",

  // PTM
  "Pemeriksaan Hipertensi": "Informasi tambahan belum tersedia.",

  // PM (Program Malaria, TB, dll. – sesuaikan dengan data kamu)
  "Pemeriksaan PM": "Informasi tambahan belum tersedia.",

  // IMS
  "Pemeriksaan IMS": "Informasi tambahan belum tersedia.",

  // ISPA
  "Pemeriksaan ISPA": "Informasi tambahan belum tersedia.",

  // Mata
  "Pemeriksaan Mata": "Informasi tambahan belum tersedia.",

  // Gizi
  "Konsultasi Gizi": "Informasi tambahan belum tersedia.",

  // Akupresur
  "Akupresur": "Informasi tambahan belum tersedia.",

  // Kirana
  "Pemeriksaan Kirana": "Informasi tambahan belum tersedia.",

  // Kesling_surveilans
  "Klinik Sanitasi": "Upaya mengintegrasikan pelayanan kesehatan promotif, preventif, dan kuratif, di tingkat puskesmas yang difokuskan pada masalah kesehatan lingkungan untuk mencegah dan menanggulangi penyakit berbasis lingkungan",
  "Laporan DBD & Cikungunya": "Informasi tambahan belum tersedia.",
  "Laporan Kematian Jenazah Sudah Dikuburkan": "Surat Keterangan Melapor Kematian, dikeluarkan oleh Puskesmas sesuai KTP almarhum/ lokasi meninggal. Form dan Persyaratan bisa diunduh di website https://bit.ly/SKMKpkmjagakarsa",
  "Laporan Kematian Jenazah Belum Dikuburkan": "Surat Keterangan Penyebab Kematian, dikeluarkan oleh Puskesmas sesuai KTP almarhum/ lokasi meninggal. Keluarga lapor ke puskesmas/ pustu sesuai lokasi meninggal dengan membawa 1.Fotokopi KTP almarhum/ah, 2. Fotokopi KK, 3. Surat Keterangan dari RT/RW setempat, 4. Surat Keterangan Domisili jika ktp alm tidak sesuai dengan tempat meninggal namun meninggal di wilayah Jagakarsa",
  "Laporan Penyakit Potensi KLB/ Wabah Difteri": "Penyakit bakteri yang menyerang tenggorokan dengan gejala demam ringan, sakit tenggorokan, terdapat selaput pada tenggorokan yang bisa membengkak. No telp pelaporan Wita:085927002059",
  "Laporan Penyakit Potensi KLB/ Wabah Pertusis (Batuk Rejan)": "Penyakit batuk 100 hari akibat bakteri dengan gejala batuk hebat bertahap, disertai suara whoop dan bisa sampai muntah. No telp pelaporan Wita:085927002059",
  "Laporan Penyakit Potensi KLB/ Wabah Campak": "Penyakit virus yang sangat menular dengan gejala demam tinggi, batuk pilek, mata merah, muncul bintih putih dalam mulut dan ruam merah pada kulit. No telp pelaporan Wita:085927002059",
  "Laporan Penyakit Potensi KLB/ Wabah Lumpuh Layu (Polio)": "Penyakit virus yang menyerang saraf dan bisa menyebabkan kelumpuhan mendadak yang ditulakan lewat makanan/minuman yang terkontaminasi feses dengan gejala demam, nyeri, lalu kelumpuhan umumnya bagian tungkai. No telp pelaporan Wita:085927002059",
  "Laporan Keracunan Pangan": "Keracunan yang terjadi pada >2 orang dalam waktu hampir bersamaan, mengonsumsi makanan/minuman yang sama, dan mengalami gejala yang mirip seperti mual, muntah, diare, sakit perut. No telp pelaporan Wita:085927002059",
  // UKS
  "Pelayanan UKS": "Informasi tambahan belum tersedia.",

  // Vaksin Dengue
  "Vaksin Dengue": "Informasi tambahan belum tersedia.",
};
