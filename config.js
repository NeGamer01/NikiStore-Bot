module.exports = {
  botName: 'NIKISTORE',
  prefix: '.',
  ownerNumber: ['241862929600639'], // nomor owner
  pairingNumber: '6288226488976',
  ownerName: 'Owner',
  packName: 'NIKISTORE',
  authorName: 'WhatsApp Bot',
  menuImage: '',

  // ─── DIGIFLAZZ ───────────────────────────────────────
  digiuser: 'wolahoD7l2KW',       // Username Digiflazz
  digiapi: 'pastekan-apikey-digikamu-disiniya',        // API Key Digiflazz

  // ─── QRISPAY GATEWAY (QRIS) ───────────────────────────
  // Dashboard: https://pay.halogamingzone.com/app (menu "API Keys" → Buat API Key)
  // API key berprefix "qp_" — key lama (npk_) dari NikiPay v2 TIDAK berlaku.
  qrispayUrl: 'https://pay.halogamingzone.com', // URL gateway QRISPay (tanpa / di akhir)
  qrispayKey: 'qp_3cf1ecde441a9155e36f6adff5eef81d38c49f6cc92c0ef2',        // API key dari dashboard QRISPay (/app → API Keys)

  // ─── PROMO NOTIFIKASI GRUP ───────────────────────────
  promoGroupJid: '120363297880854110@g.us', // Isi dengan JID grup yang mau dikirimi notifikasi transaksi sukses (contoh: '120363xxx@g.us')

  // ─── PTERODACTYL PANEL STORE ────────────────────────
  // Panel server untuk jualan server Pterodactyl (lihat lib/panelStore.js).
  // domain: panel TANPA https:// dan tanpa /
  // ptla: Application API key (ptla_...). ptlc: Client API key (ptlc_...),
  //       BISA mengandung '&loc=1' di akhir — otomatis dibersihkan di lib/panelStore.js.
  // Panel: billing.nikistore.biz.id (Application API keys ada di panel admin).
  ptero: {
    domain: 'billing.nikistore.biz.id',
    ptla: 'ptla_pPQ7tT8SoMMvYQWYVHqkpjoN4sFityvUoBQoijXrzdc',
    ptlc: 'ptlc_DziAP4Pq8yICDm4xN6LdCdwkVOfjaSXf1Ekf85f9fdF',
    apiWrapperUrl: 'https://apiku-niki.vercel.app', // wrapper pembuatan server
    locationId: '1',                   // id location di panel
    eggId: '15',                       // id egg (jenis server, mis. Minecraft)
    nestId: '5'                        // id nest (kategori egg)
  },

  // Daftar paket panel yang dijual. Ram/disk dalam MB, cpu dalam %.
  // hargaModal = biaya resource/VPS yang kamu keluarkan (untuk laporan profit).
  // Catatan: saat ini 'unlimited' belum dipakai di paket default — semua paket
  // di atas memakai angka. Kalau mau dipakai, nilai dikirim ke API sebagai 0.
  panelPackages: [
    { id: '1',  label: 'Panel 1 GB',  ram: 1024,  disk: 2048,  cpu: 100,  hargaJual: 8000,  hargaModal: 2500 },
    { id: '2',  label: 'Panel 2 GB',  ram: 2048,  disk: 4086,  cpu: 100,  hargaJual: 12000,  hargaModal: 4000 },
    { id: '4',  label: 'Panel 4 GB',  ram: 4096,  disk: 8192, cpu: 100,  hargaJual: 20000, hargaModal: 7500 },
    { id: '8',  label: 'Panel 8 GB',  ram: 8192,  disk: 10240, cpu: 100,  hargaJual: 45000, hargaModal: 12500 }
  ],

  // ─── PROFIT ──────────────────────────────────────────
  hargaAdmin: 100,
  profitSettings: {
    minPercent: 2.0,
    maxPercent: 8.0,
    priceThresholdLow: 1000,
    priceThresholdHigh: 100000
  }
}
