// src/data/services/meta.js

/* ===================== DOCTORS_BY_POLI ===================== */
/* Isi dengan mapping penanggung jawab poli (string atau array nama).
   Contoh awal — silakan lanjutkan/ubah sesuai data di services.js kamu. */
export const DOCTORS_BY_POLI = {
  "poli-umum": "dr. Dewi Wulansari",
  "poli-gigi": "drg. Tresa Vanuarin Simanungkalit",
  igd: "dr. Ranu Brata Kusuma",
  "ki-hamil": "dr. Anisah Rahma",
  "ki-nifas": "Bidan Ika Nurmalasari, A.Md. Keb.",
  catin: "dr. Cindy Audina Pradibta",
  imunisasi: "Dewi Sartika Gea, A.Md. Keb.",
  "kb-iva": "dr. Nurul Chaerani dan Bidan Marini Jagasa",
  tumbang: "Yuniar Selowati",
  mtbs: "dr. Anita Kurniasih",
  pkpr: "dr. Ensan Galuh Pertiwi",
  lansia: "dr. Fitri Astuti Aditama",
  ptm: "dr. Azzahra Azmi",
  pm: "dr. Uli Siger",
  ims: "dr. Marta Basarida",
  mata: "dr. Dewi Wulansari",
  gizi: "Miranti Mulya Diani, S. Tr.Gz",
  kirana: "dr. Ine Dianawati Kusuma",
  "Klinik Sanitasi": "Resya Karnioca, S.Tr.Kes.",
  "kesling_surveilans": "Yeyet Rahmayanti",
  "RB": "dr. Olivia Vistary, MARS. dan Bidan Rahayu Hartati.",
  ckg: "dr. Rakhmawaty",
  laboratorium: "Listia Nurlita R",
  farmasi: "Iie Sumiasih",
  haji: "dr. Dewi Wulansari",
};

/* ===================== Info Tambahan (contoh) ===================== */
export const EXTRA_INFO = {
  // Poli Umum
  "Pemeriksaan Dokter Umum": [
    "Silahkan memilih fasilitas kesehatan rujukan tingkat lanjut sesuai kebutuhan Anda.",
    { img: "/infografis/fkrtl.webp", alt: "Fasilitas Kesehatan Rujukan Tingkat Lanjut" },
  ],
  "Kontrol Berkala": "Informasi tambahan belum tersedia.",

  // Poli Gigi
  "Poli Gigi": ["Silahkan mengisi form skrining kesehatan gigi Anda di https://tally.so/r/nG8EVp . ",
    { img: "/infografis/skrining_gigi.webp", alt: "Skrining Kesehatan Gigi" },
  ],
  "Scaling/ Pembersihan Karang Gigi":"Tarif Rp90.000/ rahang.",

  // IGD
  "Tindakan Darurat": "Informasi tambahan belum tersedia.",

  // Layanan 24 Jam
  "Pemeriksaan Jenazah (24 Jam)": "Surat Keterangan Melapor Kematian, dikeluarkan oleh Puskesmas sesuai KTP almarhum/ lokasi meninggal. Form dan Persyaratan bisa diunduh di website https://bit.ly/SKMKpkmjagakarsa. Surat Keterangan Penyebab Kematian, dikeluarkan oleh Puskesmas sesuai KTP almarhum/ lokasi meninggal. Keluarga lapor ke puskesmas/ pustu sesuai lokasi meninggal dengan membawa 1.Fotokopi KTP almarhum/ah, 2. Fotokopi KK, 3. Surat Keterangan dari RT/RW setempat, 4. Surat Keterangan Domisili jika ktp alm tidak sesuai dengan tempat meninggal namun meninggal di wilayah Jagakarsa",
 
  // Catin
  "Pemeriksaan Calon Pengantin": ["1. Pernikahan (akad) akan dilaksanakan sampai 3 bulan ke depan, bila lebih dari itu proses pengajuan akan ditolak.",
    "2. Catin yang mengajukan pemeriksaan di Puskesmas Jagakarsa HARUS BERDOMISILI di wilayah kerja Puskesmas Jagakarsa.",
    "3. - Catin dengan usia >19 tahun bisa diajukan pembuatan sertifikat layak nikah.",
    "- Catin yang berusia 18 - 19 Tahun WAJIB menyertakan surat dispensasi menikah dari Pengadilan Agama/ Pengadilan Negeri",
    "- Catin berusia <18 tahun TIDAK BISA diajukan pembuatan sertifikat layak nikah, hanya bisa dilakukan pemeriksaan kesehatan saja.",
    "Informasi lebih lanjut bisa mengklik link berikut: https://bit.ly/daftarLIONTIN"],

  // KB & IVA
  "Konsultasi KB": "Konsultasi KB.",
  "Suntik KB": "Mohon untuk membawa kartu peserta KB saat kontrol.",
  "Pil KB": ["Mohon untuk membawa kartu peserta KB saat kontrol.",
  "Saat ini hanya tersedia pil kombinasi yang tidak dianjurkan untuk ibu hamil."],
  "IUD/Spiral": "IUD adalah alat kontrasepsi terbuat dari plastik yang fleksibel dipasang dalam rahim, dengan menjepit kedua saluran yang menghasilkan indung telur sehingga tidak terjadi pembuahan.",
  "IVA Test + HPV DNA": ["Test IVA dan HPV DNA dapat dilakukan pada pasien belum/ sudah menikah namun aktif secara seksual.", "Tidak diperkenankan berhubungan H-1 dan tidak sedang haid untuk test IVA dan HPV DNA.", "Batas usia test adalah 69 tahun."],
  "Implant/ Susuk" : ["Implant adalah alat kontrasepsi yang dipasang di bawah lapisan kulit subkutan pada lengan atas bagian samping dalam.", "Mohon untuk membawa kartu peserta KB saat kontrol."],

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
  "Pemeriksaan PM": "Tes Mantoux, atau tes kulit tuberkulosis, adalah pemeriksaan untuk mendeteksi paparan bakteri tuberkulosis (TB) tersedia Senin - Selasa. Jadwal pengobatan TB Resisten Obat khusus Hari Jumat pukul 13. 00 - 15.00.",

  // IMS
  "Pemeriksaan IMS": "Informasi tambahan belum tersedia.",

  // ISPA
  "Pemeriksaan ISPA": "Informasi tambahan belum tersedia.",

  // Farmasi
  "Layanan Obat 24 Jam":"Tarif pendaftaran Puskesmas sudah termasuk obat yang diresepkan. Mohon untuk mengambil obat untuk layanan pagi/siang tidak lebih dari pukul 19.00, jika lebih maka dianggap pasien tidak mengambil obat. Farmasi puskesmas tidak melayani pembelian resep obat umum, hanya menerima resep dari poli Puskesmas Jagakarsa atau Puskesmas Pembantu di wilayah Kecamatan Jagakarsa" ,
  "Konseling Obat":"Konseling obat diberikan pada pasien lansia, polifarmasi (kebutuhan konsumsi obat dalam jumlah banyak (biasanya >5) pada waktu bersamaan), pasien ibu hamil, pasien dengan penggunaan obat secara khusus, kepatuhan obat, pasien dengan penyakit kronis, anak-anak, ibu hamil, dan peresepan obat dalam jangka panjang, atau kondisi lain yang membutuhkan konsultasi.",

  // Mata
  "Pemeriksaan Mata": "Pemeriksaan refraksi mata, pinhole, dan koreksi lensa. Bila ditemukan kelainan mata yang memerlukan penanganan lebih lanjut, pasien akan dirujuk ke dokter spesialis mata di rumah sakit rujukan.",

  // Gizi
  "Konseling Gizi": [
  "Melayani konseling terkait,",
  "1. Tatalaksana Diet Penyakit",
  "2. Konseling Pemberian Makanan Bayi dan Anak (PMBA)",
  "3. Tatalaksana Gizi Buruk",
  "4. Konseling Ibu Hamil Kurang Energi Kronis"
],

  // KI Hamil
  "Pemeriksaan Ibu Hamil": "Kunjungan kehamilan 1 (6-8 minggu), kunjungan kehamilan 2 (10-12 minggu), kunjungan kehamilan 3 (16 minggu), kunjungan kehamilan 4 (20 minggu), kunjungan kehamilan 5 (24 minggu), kunjungan kehamilan 6 (28 minggu), kunjungan kehamilan 7 (32 minggu), kunjungan kehamilan 8 (36 minggu), kunjungan kehamilan 9 (37-41 minggu) dilakukan di ruang KI hamil lantai 2, ikuti instruksi petugas.",
  // KI Nifas
  "Pemeriksaan Nifas": "Kontrol nifas menerima persalinan dari RS atau Puskesmas. Pendaftaran dilakukan untuk bayi dan ibu nifas. Kunjungan nifas 2 (3-7 hari setelah persalinan), kunjungan nifas 3 (7-28 hari setelah persalinan), kunjungan nifas 4 hanya untuk ibu, bayi langsung didaftarkan untuk poli imunisasi (29-42 hari setelah persalinan) dilakukan di ruang nifas lantai 1, ikuti instruksi petugas.",
  "Tindik Bayi": "Bayi usia dibawah 4 bulan dan diharapkan membawa anting dengan model lingkaran pendaftaran 10.000 + tindakan 45.000",
  // Kirana
  "Pemeriksaan Kirana": "Informasi tambahan belum tersedia.",

  // Kesling_surveilans
  "Klinik Sanitasi": "Upaya mengintegrasikan pelayanan kesehatan promotif, preventif, dan kuratif, di tingkat puskesmas yang difokuskan pada masalah kesehatan lingkungan untuk mencegah dan menanggulangi penyakit berbasis lingkungan",
  "Laporan DBD & Cikungunya": "Bila menemukan kejadian DBD / Cikungunya di wilayah Jagakarsa silahkan menghubungi petugas Puskesmas untuk tindak lanjut. No telp pelaporan EDHO: 082186758984",
  "Laporan Kematian Jenazah Sudah Dikuburkan": "Surat Keterangan Melapor Kematian, dikeluarkan oleh Puskesmas sesuai KTP almarhum/ lokasi meninggal. Form dan Persyaratan bisa diunduh di website https://bit.ly/SKMKpkmjagakarsa",
  "Laporan Kematian Jenazah Belum Dikuburkan": "Surat Keterangan Penyebab Kematian, dikeluarkan oleh Puskesmas sesuai KTP almarhum/ lokasi meninggal. Keluarga lapor ke puskesmas/ pustu sesuai lokasi meninggal dengan membawa 1.Fotokopi KTP almarhum/ah, 2. Fotokopi KK, 3. Surat Keterangan dari RT/RW setempat, 4. Surat Keterangan Domisili jika ktp alm tidak sesuai dengan tempat meninggal namun meninggal di wilayah Jagakarsa",
  "Laporan Penyakit Potensi KLB/ Wabah Difteri": "Penyakit bakteri yang menyerang tenggorokan dengan gejala demam ringan, sakit tenggorokan, terdapat selaput pada tenggorokan yang bisa membengkak. No telp pelaporan EDHO: 082186758984",
  "Laporan Penyakit Potensi KLB/ Wabah Pertusis (Batuk Rejan)": "Penyakit batuk 100 hari akibat bakteri dengan gejala batuk hebat bertahap, disertai suara whoop dan bisa sampai muntah. No telp pelaporan EDHO: 082186758984",
  "Laporan Penyakit Potensi KLB/ Wabah Campak": "Penyakit virus yang sangat menular dengan gejala demam tinggi, batuk pilek, mata merah, muncul bintik putih dalam mulut dan ruam merah pada kulit. No telp pelaporan EDHO: 082186758984",
  "Laporan Penyakit Potensi KLB/ Wabah Lumpuh Layu (Polio)": "Penyakit virus yang menyerang saraf dan bisa menyebabkan kelumpuhan mendadak yang ditulakan lewat makanan/minuman yang terkontaminasi feses dengan gejala demam, nyeri, lalu kelumpuhan umumnya bagian tungkai. No telp pelaporan EDHO: 082186758984",
  "Laporan Keracunan Pangan": "Keracunan yang terjadi pada >2 orang dalam waktu hampir bersamaan, mengonsumsi makanan/minuman yang sama, dan mengalami gejala yang mirip seperti mual, muntah, diare, sakit perut. No telp pelaporan EDHO: 082186758984",
  // UKS
  "Pelayanan UKS": "Informasi tambahan belum tersedia.",

  // LABORATORIUM
  "Laboratorium": ["Pemeriksaan Laboratorium Puskesmas Jagakarsa HANYA untuk rujukan internal Puskesmas Kecamatan Jagakarsa/ Puskesmas Pembantu di Wilayah Kecamatan Jagakarsa",
                   { img: "/infografis/daftar-waktu-penyampaian-hasil-lab-1.webp", alt: "Daftar Waktu Penyampaian Hasil Lab" },
                   { img: "/infografis/daftar-waktu-penyampaian-hasil-lab-2.webp", alt: "Daftar Waktu Penyampaian Hasil Lab" },
  ],

  // CKG
  "Cek Kesehatan Gratis": [
    "Pemeriksaan Kesehatan Gratis (CKG) adalah program pemerintah untuk mendeteksi dini faktor risiko penyakit tidak menular seperti hipertensi, diabetes, kolesterol tinggi, dan obesitas pada anak usia 0-5 tahun dan dewasa 15 tahun ke atas 1 kali setahun.",
    "Pemeriksaan ini meliputi pengukuran tekanan darah, gula darah, kolesterol (sesuai faktor risiko), pemriksaan indeks massa tubuh (IMT),dan pemeriksaan lain sesuai faktor risiko dan paket pemeriksaan sesuai usia, yang disertai konseling kesehatan untuk mengelola faktor risiko penyakit yang ditemukan",
    "Pasien disarankan untuk melakukan puasa 8-12 jam dari pukul 10 malam dan datang pagi ke Puskesmas untuk CKG agar tidak melewatai batas puasa",
    "Jangan lupa ajak keluarga Anda atau teman Anda untuk ikut serta dalam program CKG ini",
  ],
  //RB
  "Ruang Bersalin": [
    "Pelayanan dimulai 24 jam, setiap hari.",
    "Bidan yang bertugas di Ruang Bersalin adalah bidan profesional dan berpengalaman.",
    "Fasilitas lengkap untuk mendukung proses persalinan yang aman dan nyaman.",
    "Jam besuk untuk keluarga adalah setiap hari pukul 17.00 - 18.00 WIB selain itu ibu hanya diizinkan didampingi 1 orang keluarga selama proses persalinan.",
    "Pastikan membawa perlengkapan pribadi yang diperlukan selama di ruang bersalin.",
    "Bagi warga DKI Jakarta yang melahirkan di Puskesmas Jagakarsa Langsung Mendapatkan Akte Kelahiran, KK, dan KIA dengan persyaraatan sebagai berikut:",
    "- Fotocopy KTP-el kedua orang tua",
    "- Fotocopy KTP-el 2 orang saksi (saksi harus warga DKI Jakarta)",
    "- Fotocopy Buku Nikah",
    "- KK Asli",
    "- Surat Keterangan Lahir dari Puskesmas",
    "- Nama bayi sudah ditentukan",
    { img: "/infografis/rb1.jpg", alt: "Ruang Bersalin" },
    { img: "/infografis/rb2.jpg", alt: "Ruang Bersalin" },
    { img: "/infografis/rb3.jpg", alt: "Ruang Bersalin" },
    { img: "/infografis/rb4.jpg", alt: "Ruang Bersalin" },
  ],
};
