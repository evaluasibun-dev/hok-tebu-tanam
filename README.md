# Sistem HOK Tebu 15 + 25 (2026)

Aplikasi web untuk pengisian dan pemantauan Hari Orang Kerja (HOK) dengan skema **pengolahan lahan 15 HOK/ha + penanaman 25 HOK/ha**, kegiatan **Perluasan Tanaman Tebu** dan **Bongkar Ratoon**, Direktorat Jenderal Perkebunan.

- Kabupaten mengisi data poktan, pekerja dan kehadiran harian, mengunggah foto dan dokumen, lalu mencetak form F00–F11 dan F13 atau mengunduhnya sebagai Word/Excel sesuai template resmi.
- Setiap isian divalidasi langsung: NIK 16 digit, urutan tanggal dokumen, HOK maksimal sebesar target, dan pekerja yang tercatat hadir di dua poktan pada hari yang sama (hari ganda) di seluruh kabupaten.
- Provinsi dan pusat memantau progres, kelengkapan dokumen, temuan dan potensi kelebihan bayar.

Repositori ini **hanya berisi tampilan**. Data, berkas dan login tersimpan di Google Sheets/Drive dan Apps Script milik Tim Kerja Evaluasi dan Pelaporan, dan tidak ada di sini.

Coba tanpa server: buka halaman dengan tambahan `?demo=1` di alamat. Mode ini memakai data contoh fiktif yang hanya tersimpan di browser.

Pustaka pihak ketiga (dimuat dari cdnjs): [SheetJS](https://sheetjs.com) 0.18.5 (Apache-2.0) untuk impor Excel, [JSZip](https://stuk.github.io/jszip/) 3.10.1 (MIT) untuk unduhan Word, dan [ExcelJS](https://github.com/exceljs/exceljs) 4.4.0 (MIT) untuk unduhan Excel.
