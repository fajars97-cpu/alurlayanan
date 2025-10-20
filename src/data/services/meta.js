// src/data/services/meta.js

/* ===================== DOCTORS_BY_POLI ===================== */
/* Isi dengan mapping penanggung jawab poli (string atau array nama).
   Contoh awal — silakan lanjutkan/ubah sesuai data di services.js kamu. */
export const DOCTORS_BY_POLI = {
  "poli-umum": "dr. Natasha Adjani",
  "poli-gigi": "drg. Gigi",
  igd: "dr. IGD",
  "ki-hamil": "Bidan Ani",
  "ki-nifas": "Bidan Siti",
  catin: "Bidan Dewi",
  imunisasi: "Dewi Sartika Gea, A.Md. Keb.",
  "kb-iva": "Bidan Tika",
  tumbang: "Yuniar Selowati",
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
  "RB": "Bidan Ika Nurmalasari, A.Md. Keb.",
  ckg: "dr. Rakhmawaty",
};

/* ===================== Info Tambahan (contoh) ===================== */
export const EXTRA_INFO = {
  // Poli Umum
  "Pemeriksaan Umum": [
    "Silahkan memilih fasilitas kesehatan rujukan tingkat lanjut sesuai kebutuhan Anda.",
    { img: "/infografis/fkrtl.webp", alt: "Fasilitas Kesehatan Rujukan Tingkat Lanjut" },
  ],

  "Kontrol Berkala": "Informasi tambahan belum tersedia.",

  // Poli Gigi
  "Cabut Gigi": "Informasi tambahan belum tersedia.",
  "Scaling": "Informasi tambahan belum tersedia.",

  // IGD
  "Tindakan Darurat": "Informasi tambahan belum tersedia.",

  // Layanan 24 Jam
  "Pemeriksaan Jenazah (24 Jam)": "Surat Keterangan Melapor Kematian, dikeluarkan oleh Puskesmas sesuai KTP almarhum/ lokasi meninggal. Form dan Persyaratan bisa diunduh di website https://bit.ly/SKMKpkmjagakarsa. Surat Keterangan Penyebab Kematian, dikeluarkan oleh Puskesmas sesuai KTP almarhum/ lokasi meninggal. Keluarga lapor ke puskesmas/ pustu sesuai lokasi meninggal dengan membawa 1.Fotokopi KTP almarhum/ah, 2. Fotokopi KK, 3. Surat Keterangan dari RT/RW setempat, 4. Surat Keterangan Domisili jika ktp alm tidak sesuai dengan tempat meninggal namun meninggal di wilayah Jagakarsa",
  // KB & IVA
  "Konseling KB": "Informasi tambahan belum tersedia.",
  "Pemeriksaan IVA": "Informasi tambahan belum tersedia.",

  // Imunisasi
  "Imunisasi HB": "Imunisasi HB adalah vaksin hepatitis B yang diberikan kepada bayi baru lahir, idealnya dalam 24 jam pertama kehidupan (HB0), Usia 2 bulan (HB-1), 3 bulan (HB-2), dan 4 bulan (HB-3). Vaksin ini melindungi bayi dari infeksi virus hepatitis B yang dapat menyebabkan penyakit hati serius.",
  "Imunisasi DPT": "Imunisasi DPT adalah vaksin yang melindungi terhadap tiga penyakit serius: Difteri, Pertusis (batuk rejan), dan Tetanus. Vaksin ini diberikan pada usia 2 bulan (DPT-1), 3 bulan (DPT-2), dan 4 bulan (DPT-3).",
  "Imunisasi OPV (Polio Tetes)": "Imunisasi OPV (Oral Polio Vaccine) adalah vaksin yang diberikan secara tetes oral untuk melindungi anak-anak dari penyakit polio, yang dapat menyebabkan kelumpuhan. Vaksin ini diberikan pada bayi usia 1 bulan (OPV-1), 2 bulan (OPV-2), dan 3 bulan (OPV-3), dan 4 bulan (OPV-4).",
  "Imunisasi PCV": "Imunisasi PCV (Pneumococcal Conjugate Vaccine) adalah vaksin yang melindungi terhadap infeksi bakteri Streptococcus pneumoniae, yang dapat menyebabkan penyakit serius seperti pneumonia, meningitis, dan infeksi darah pada anak-anak. Vaksin ini diberikan pada bayi usia 2 bulan (PCV-1), 3 bulan (PCV-2), dan 12 bulan (PCV-3).",
  "Imunisasi IPV": "Imunisasi IPV (Inactivated Polio Vaccine) adalah vaksin yang diberikan melalui suntikan untuk melindungi terhadap penyakit polio, yang dapat menyebabkan kelumpuhan. IPV mengandung virus polio yang telah dimatikan sehingga tidak dapat menyebabkan penyakit. Vaksin ini diberikan pada bayi usia 4 bulan (IPV-1) dan 9 bulan (IPV-2).",
  "Imunisasi Rotavirus": "Imunisasi Rotavirus adalah vaksin yang diberikan untuk melindungi bayi dan anak-anak dari infeksi rotavirus, yang merupakan penyebab utama diare parah pada anak-anak di seluruh dunia. Vaksin ini diberikan pada usia 2 bulan (Rotavirus-1), 3 bulan (Rotavirus-2), dan 4 bulan (Rotavirus-3).",
  "Imunisasi MR": "Imunisasi MR (Measles-Rubella) adalah vaksin yang melindungi terhadap dua penyakit menular: campak (measles) dan rubella (campak Jerman). Vaksin ini biasanya diberikan dalam dua dosis pada anak-anak pada usia 9 bulan (MR-1) dan 18 bulan (MR-2).",
  "Imunisasi BCG": "Imunisasi BCG (Bacillus Calmette-Guérin) adalah vaksin yang digunakan untuk melindungi terhadap tuberkulosis (TB), terutama bentuk TB yang parah pada anak-anak, seperti TB meningitis dan TB milier. Vaksin ini diberikan pada bayi usia 1 bulan.",
  "Imunisasi TD Ibu Hamil": "Imunisasi TD (Tetanus-Diphtheria) untuk ibu hamil adalah vaksin yang diberikan untuk melindungi ibu dan bayi dari tetanus neonatal, yang dapat terjadi jika bayi terinfeksi tetanus saat lahir. Vaksin ini biasanya diberikan pada ibu hamil pada usia kehamilan 20 minggu atau lebih.",
  // Tumbang
  "Konsultasi Tumbuh Kembang Anak": "Poli Tumbang tersedia untuk anak usia 0 - 72 bulan.",

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

  // KI Nifas
  "Pemeriksaan Nifas": "Kunjungan nifas 2 (3-7 hari setelah persalinan), kunjungan nifas 3 (7-28 hari setelah persalinan), kunjungan nifas 4 (29-42 hari setelah persalinan) dilakukan di ruang nifas lantai 1, ikuti instruksi petugas.",

  // Kirana
  "Pemeriksaan Kirana": "Informasi tambahan belum tersedia.",

  // Kesling_surveilans
  "Klinik Sanitasi": "Upaya mengintegrasikan pelayanan kesehatan promotif, preventif, dan kuratif, di tingkat puskesmas yang difokuskan pada masalah kesehatan lingkungan untuk mencegah dan menanggulangi penyakit berbasis lingkungan",
  "Laporan DBD & Cikungunya": "Bila menemukan kejadian DBD / Cikungunya di wilayah Jagakarsa silahkan menghubungi petugas Puskesmas untuk tindak lanjut. No telp pelaporan Wita: 085927002059",
  "Laporan Kematian Jenazah Sudah Dikuburkan": "Surat Keterangan Melapor Kematian, dikeluarkan oleh Puskesmas sesuai KTP almarhum/ lokasi meninggal. Form dan Persyaratan bisa diunduh di website https://bit.ly/SKMKpkmjagakarsa",
  "Laporan Kematian Jenazah Belum Dikuburkan": "Surat Keterangan Penyebab Kematian, dikeluarkan oleh Puskesmas sesuai KTP almarhum/ lokasi meninggal. Keluarga lapor ke puskesmas/ pustu sesuai lokasi meninggal dengan membawa 1.Fotokopi KTP almarhum/ah, 2. Fotokopi KK, 3. Surat Keterangan dari RT/RW setempat, 4. Surat Keterangan Domisili jika ktp alm tidak sesuai dengan tempat meninggal namun meninggal di wilayah Jagakarsa",
  "Laporan Penyakit Potensi KLB/ Wabah Difteri": "Penyakit bakteri yang menyerang tenggorokan dengan gejala demam ringan, sakit tenggorokan, terdapat selaput pada tenggorokan yang bisa membengkak. No telp pelaporan Wita: 085927002059",
  "Laporan Penyakit Potensi KLB/ Wabah Pertusis (Batuk Rejan)": "Penyakit batuk 100 hari akibat bakteri dengan gejala batuk hebat bertahap, disertai suara whoop dan bisa sampai muntah. No telp pelaporan Wita: 085927002059",
  "Laporan Penyakit Potensi KLB/ Wabah Campak": "Penyakit virus yang sangat menular dengan gejala demam tinggi, batuk pilek, mata merah, muncul bintik putih dalam mulut dan ruam merah pada kulit. No telp pelaporan Wita: 085927002059",
  "Laporan Penyakit Potensi KLB/ Wabah Lumpuh Layu (Polio)": "Penyakit virus yang menyerang saraf dan bisa menyebabkan kelumpuhan mendadak yang ditulakan lewat makanan/minuman yang terkontaminasi feses dengan gejala demam, nyeri, lalu kelumpuhan umumnya bagian tungkai. No telp pelaporan Wita: 085927002059",
  "Laporan Keracunan Pangan": "Keracunan yang terjadi pada >2 orang dalam waktu hampir bersamaan, mengonsumsi makanan/minuman yang sama, dan mengalami gejala yang mirip seperti mual, muntah, diare, sakit perut. No telp pelaporan Wita: 085927002059",
  // UKS
  "Pelayanan UKS": "Informasi tambahan belum tersedia.",

  // CKG
  "Cek Kesehatan Gratis": "Pemeriksaan Kesehatan Gratis (CKG) adalah program pemerintah untuk mendeteksi dini faktor risiko penyakit tidak menular seperti hipertensi, diabetes, kolesterol tinggi, dan obesitas pada masyarakat usia 15 tahun ke atas. Pemeriksaan ini meliputi pengukuran tekanan darah, gula darah, kolesterol (sesuai faktor risiko), pemriksaan indeks massa tubuh (IMT),dan pemeriksaan lain sesuai faktor risiko dan paket pemeriksaan sesuai usia, yang disertai konseling kesehatan untuk mengelola faktor risiko penyakit yang ditemukan. Pasien disarankan untuk melakukan puasa dari pukul 10 malam dan datang pagi ke Puskesmas untuk CKG agar tidak menunggu pemeriksaan laboratorium yang terlalu lama.",
  //RB
  "Ruang Bersalin": [
    "Pelayanan dimulai 24 jam, setiap hari.",
    "Bidan yang bertugas di Ruang Bersalin adalah bidan profesional dan berpengalaman.",
    "Fasilitas lengkap untuk mendukung proses persalinan yang aman dan nyaman.",
    "Jam besuk untuk keluarga adalah setiap hari pukul 17.00 - 18.00 WIB selain itu ibu hanya diizinkan didampingi 1 orang keluarga selama proses persalinan.",
    "Pastikan membawa perlengkapan pribadi yang diperlukan selama di ruang bersalin.",
    { img: "/infografis/rb1.jpg", alt: "Ruang Bersalin" },
    { img: "/infografis/rb2.jpg", alt: "Ruang Bersalin" },
    { img: "/infografis/rb3.jpg", alt: "Ruang Bersalin" },
    { img: "/infografis/rb4.jpg", alt: "Ruang Bersalin" },
  ],
};
