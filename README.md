# 🤖 NIKISTORE — WhatsApp Bot Auto-Store

Bot WhatsApp toko otomatis serba ada: top up game, e-money, pulsa, kuota, PLN, **sewa server Pterodactyl (panel)**, pembayaran QRIS otomatis, dan manajemen grup — semuanya dalam satu script.

Script ini **100% gratis**. Tinggal clone, isi config, jalankan.

---

## ✨ Fitur Utama

### 🎮 Top Up Game (otomatis via Digiflazz)
- 25+ game: Mobile Legends, Free Fire, PUBG Mobile, Genshin Impact, Honkai Star Rail, Valorant, COD Mobile, Delta Force, FC Mobile, Honor of Kings, Metal Slug, Point Blank, Sausage Man, Stumble Guys, Undawn, Arena of Valor, PUBG New State, dll.
- **Cek ID otomatis** sebelum beli (ML, FF, dll) — salah ID langsung ketahuan
- Invoice gambar otomatis setelah transaksi sukses

### 💳 E-Money, Pulsa & Kuota
- DANA, GoPay, OVO, ShopeePay
- Pulsa semua operator, paket kuota internet

### ⚡ PLN & TV
- Token listrik PLN, Nex Parabola

### 🖥️ Panel Server (Jualan Server Pterodactyl) — *Fitur Unggulan*
- Jual server Pterodactyl langsung dari WhatsApp, **pembuatan server 100% otomatis**
- User pilih paket (1GB / 2GB / 4GB / 8GB) → kirim username → server langsung dibuat
- Bayar pakai saldo atau QRIS
- User dapat kredensial (link panel, username, password) otomatis di chat
- Server gagal dibuat? **Saldo otomatis dikembalikan** + alasan jelas
- Panel Pterodactyl-nya kamu sendiri (butuh Application API key + Client API key)

### 💰 Payment & Saldo
- Deposit saldo via **QRIS** (QRISPay Gateway) — semua bank & e-money
- Transfer saldo antar user
- Cek saldo & riwayat transaksi

### 👥 Manajemen Grup
- **Welcome message** otomatis + teks bisa diatur sendiri (`.setwelcome`)
- **Left message** otomatis + teks bisa diatur sendiri (`.setleft`)
- Anti link, anti spam, anti kata kasar (kata bisa ditambah sendiri)

### 👑 Owner Tools
- Tambah/kurangi saldo user
- Broadcast ke semua chat
- Laporan transaksi harian / mingguan / bulanan (omzet + profit)
- Cek koneksi gateway QRISPay & saldo Digiflazz
- Update database produk Digiflazz
- Kelola server panel (hapus server user)
- Eval & exec untuk debugging

### 🔒 Keamanan
- Command owner hanya bisa dijalankan oleh nomor yang ada di config
- Sistem registrasi: user wajib `.daftar` sebelum pakai
- Anti-spam di command

---

## 📦 Cara Instalasi

### Persyaratan
- **Node.js** versi 18 atau lebih baru
- **Termux / VPS / Windows** (rekomendasi: Termux di Android atau VPS)
- Koneksi internet stabil
- Nomor WhatsApp khusus untuk bot (tidak dipakai di HP utama)

### Langkah-langkah

```bash
# 1. Clone repository
git clone https://github.com/USERNAME/nikistore-bot.git
cd nikistore-bot

# 2. Install dependencies
npm install

# 3. Salin config template & isi (WAJIB)
cp config.example.js config.js
nano config.js
# atau pakai editor lain: vim config.js / pico config.js

# 4. Jalankan bot
node index.js
```

Bot akan menampilkan **QR Code** — scan pakai WhatsApp (menu: WhatsApp Web / Tautkan perangkat).

> 💡 **Tanpa QR code?** Scan biasanya muncul otomatis. Kalau layar kekecilan, pakai `.device teks` setelah bot jalan untuk tampilan teks.

### Menjalankan di Background (opsional)

**Termux:**
```bash
pkg install nodejs-lts git
git clone https://github.com/USERNAME/nikistore-bot.git
cd nikistore-bot
npm install
node index.js
```
Bot tetap jalan selama Termux tidak di-kill. Pakai `termux-wake-lock` biar tidak tertidur.

**VPS (PM2):**
```bash
npm install -g pm2
pm2 start index.js --name nikistore
pm2 save
pm2 startup
```

---

## ⚙️ Config Wajib (`config.js`)

Buka `config.js`, isi bagian ini sebelum dijalankan:

| Field | Keterangan |
|---|---|
| `botName` | Nama bot kamu |
| `ownerNumber` | Nomor WhatsApp kamu (format: `62812xxxxxxx`, tanpa `+`) |
| `pairingNumber` | Nomor untuk pairing code (opsional) |
| `digiuser` | Username Digiflazz ([daftar di sini](https://digiflazz.com)) |
| `digiapi` | API Key Digiflazz (dashboard → API Keys) |
| `qrispayUrl` | URL gateway QRISPay |
| `qrispayKey` | API key QRISPay (dashboard → API Keys) |

**Optional (fitur tertentu):**

| Field | Fitur |
|---|---|
| `promoGroupJid` | Grup untuk notifikasi transaksi sukses (marketing) |
| `ptero` | Panel Pterodactyl — domain, ptla, ptlc, egg, nest (lihat di bawah) |
| `panelPackages` | Daftar paket panel + harga |
| `hargaAdmin` | Biaya admin per transaksi |
| `profitSettings` | Pengaturan profit otomatis |

---

## 🖥️ Setup Fitur Panel Pterodactyl

Fitur jualan server butuh panel Pterodactyl milikmu sendiri.

### 1. Install Pterodactyl Panel
Ikuti dokumentasi resmi: **https://pterodactyl.io** (butuh VPS)

### 2. Buat API Key

Masuk panel sebagai admin → **Admin → API**:

1. **Application API** (untuk membuat server):
   - Klik **Create New**
   - **Centang semua permission** di bagian **User** dan **Server**
   - Allowed IP: isi IP server bot kamu (atau `*` untuk semua)
   - Copy key yang diawali `ptla_`

2. **Client API** (untuk kelola server):
   - **Account → API Credentials → Create**
   - Copy key yang diawali `ptlc_`

### 3. Isi `config.js`

```javascript
ptero: {
  domain: 'panel.domainmu.com',   // tanpa https://
  ptla: 'ptla_xxxxxxxx',           // Application API key
  ptlc: 'ptlc_xxxxxxxx',           // Client API key
  apiWrapperUrl: 'https://apiku-niki.vercel.app',
  locationId: '1',
  eggId: '15',                     // egg Minecraft (contoh)
  nestId: '5'
}
```

### 4. Atur Paket Panel

Sesuaikan harga & spesifikasi di bagian `panelPackages`. Format: RAM & disk dalam **MB**, CPU dalam **%**.

```javascript
panelPackages: [
  { id: '1', label: 'Panel 1 GB', ram: 1024, disk: 2048, cpu: 100, hargaJual: 8000, hargaModal: 2500 }
]
```

> ⚠️ **Perhatian:** `ptla` (Application API key) punya akses penuh ke panelmu. **Jangan pernah share config.js ke siapapun.**

---

## 📖 Daftar Command Lengkap

### 👤 Umum (semua user)
| Command | Fungsi |
|---|---|
| `.daftar` | Daftar nomor WA kamu (wajib sebelum pakai bot) |
| `.menu` | Tampilkan menu utama |
| `.allgame` | Daftar semua game & top up |
| `.ping` | Cek kecepatan respon bot |
| `.info` | Informasi bot |
| `.device` | Ganti tampilan menu (Button / Teks) |
| `.ceklid` | Cek LID/JID WhatsApp kamu |
| `.buy <sku> <id>` | Beli produk langsung pakai kode SKU |

### 🎮 Top Up Game
Pilih menu lewat `.menu` atau langsung ketik commandnya, contoh:
```
.ml        → menu Mobile Legends
.freefire  → menu Free Fire
.pubg      → menu PUBG Mobile
.genshin   → menu Genshin Impact
.valorant  → menu Valorant
.steam     → menu Steam Wallet
```
*(25+ game lainnya — lihat `.allgame` untuk daftar lengkap)*

### 💳 E-Money, Pulsa, Kuota, PLN
```
.dana    .gopay    .ovo    .shopeepay
.pulsa   .kuota    .token (PLN)   .tv (Nex Parabola)
```

### 💰 Payment & Saldo
| Command | Fungsi |
|---|---|
| `.deposit <nominal>` | Deposit saldo via QRIS (min Rp 10.000) |
| `.saldo` | Cek saldo kamu |
| `.transfer <nomor> <jumlah>` | Transfer saldo ke user lain |
| `.riwayat` | Riwayat transaksi kamu |

### 🖥️ Panel Server
| Command | Fungsi |
|---|---|
| `.panel` | Lihat paket server & beli |
| `.panelku` | Cek server yang sudah kamu beli |

**Cara beli:**
1. Ketik `.panel` → pilih paket (1GB / 2GB / 4GB / 8GB)
2. Bot tampilkan detail spek, lalu minta kamu kirim **username**
3. Kirim username yang kamu mau (contoh: `serverku`)
4. Kalau saldo cukup → server **langsung dibuat** & kredensial dikirim ke kamu
   Kalau saldo kurang → bot buatkan QRIS, bayar, server dibuat otomatis
5. Ketik `batal` kalau mau membatalkan

> 💡 Username: 3–16 huruf, hanya huruf/angka, tanpa spasi.

### 👥 Grup (Admin grup saja)
| Command | Fungsi |
|---|---|
| `.welcome` | On/off pesan selamat datang |
| `.setwelcome <teks>` | Atur teks welcome (`@user` = mention member baru) |
| `.left` | On/off pesan perpisahan |
| `.setleft <teks>` | Atur teks perpisahan (`@user` = mention member) |
| `.antilink` | On/off anti link WhatsApp |
| `.antispam` | On/off anti spam |
| `.antikasar` | On/off anti kata kasar |
| `.addkata <kata>` | Tambah kata kasar ke filter |
| `.delkata <kata>` | Hapus kata dari filter |
| `.listkata` | Lihat daftar kata terfilter |
| `.idgrup` | Cek ID grup |

**Contoh:**
```
.setwelcome Selamat datang @user di grup kami! Jangan lupa baca deskripsi.
.setleft Selamat tinggal @user, terima kasih sudah bergabung.
```

### 👑 Owner (hanya nomor di `config.ownerNumber`)
| Command | Fungsi |
|---|--- |
| `.ownermenu` | Menu khusus owner |
| `.addsaldo <@user/nomor> <jumlah>` | Tambah saldo user |
| `.minsaldo <@user/nomor> <jumlah>` | Kurangi saldo user |
| `.laporan` | Laporan harian/mingguan/bulanan (omzet + profit) |
| `.bc <teks>` | Broadcast ke semua chat |
| `.getdigi` | Update database produk Digiflazz |
| `.ceksaldo` | Cek saldo Digiflazz |
| `.cekpay` | Cek koneksi gateway QRISPay |
| `.digilog` | Lihat log Digiflazz terakhir |
| `.setptero` | Lihat/atur config panel Pterodactyl |
| `.delpanel <id>` | Hapus server panel user |
| `.eval <kode>` | Eksekusi JavaScript (debugging) |
| `.exec <command>` | Eksekusi shell command (debugging) |

---

## 🔄 Alur Kerja Singkat

**Top up game (contoh):**
```
.ml → pilih produk → masukkan ID → konfirmasi → bayar (saldo/QRIS)
     → Digiflazz proses → invoice dikirim → saldo dipotong
```

**Beli server panel:**
```
.panel → pilih paket → kirim username → bayar (saldo/QRIS)
       → server dibuat otomatis → kredensial dikirim
```

---

## ❓ Troubleshooting

**Bot tidak balas command apapun**
- Cek internet stabil & bot masih jalan (tidak crash)
- Pastikan user sudah `.daftar`
- Di grup, command owner/payment/topup sengaja dimatikan (privasi) — pakai chat pribadi

**QRIS tidak muncul / gagal**
- Cek `qrispayKey` sudah benar
- Owner ketik `.cekpay` untuk test koneksi gateway

**Top up game gagal / produk tidak ada**
- Owner ketik `.getdigi` untuk update database produk
- Cek `.ceksaldo` — pastikan saldo Digiflazz cukup

**Fitur panel error: "unauthorized" / "AccessDenied"**
- API key `ptla` kurang permission → buat ulang, **centang semua permission User & Server**
- Allowed IP belum diisi → tambah IP server bot

**Fitur panel: "Panel Store belum dibuka"**
- Config `ptero` belum diisi → isi domain, ptla, ptlc (lihat bagian setup panel)

**Welcome message tidak muncul**
- Ketik `.welcome` di grup untuk menyalakan
- Pastikan bot **admin** di grup itu

**Sudah isi config tapi fitur tidak aktif**
- Restart bot: matikan (Ctrl+C), lalu `node index.js` lagi

---

## 🔐 Catatan Keamanan

- **`config.js` berisi semua API key & password. JANGAN di-commit ke GitHub publik.** Tambahkan `config.js` ke `.gitignore`, atau push versi dengan nilai kosong.
- API key `ptla` punya akses **penuh** ke panel Pterodactyl kamu
- API key Digiflazz terhubung langsung ke saldo kamu

---

## 📋 Tech Stack

- **Runtime:** Node.js 18+
- **WA Library:** Baileys (`@sasa-dev/void-baileys`)
- **Payment:** QRISPay Gateway (QRIS dinamis)
- **Supplier:** Digiflazz API
- **Panel:** Pterodactyl API (via wrapper)
- **Database:** JSON file-based (tanpa instalasi)

---

## 📣 Profil & Grup

- **Pemilik:** Bagas NikiStore
- **WhatsApp:** 085171502270
- **Link Grup WhatsApp:** https://bit.ly/NikiStore

Mari bergabung ke grup kami untuk info update, promo, dan bantuan! 🙏

---

## ⚖️ Lisensi & Syarat Pakai

Script ini **gratis** untuk dipakai sendiri. Dilarang:
- ❌ **Menjual ulang** script ini (atau mengklaim sebagai buatanmu)
- ❌ Menghapus kredit
- ✅ **Boleh** dipakai untuk jualan (jasa top up, sewa panel, dll) — itu fungsinya
- ✅ Boleh dimodifikasi untuk kebutuhan pribadi

Dipakai untuk hal ilegal? Tanggung jawab sendiri. Developer tidak bertanggung jawab atas penyalahgunaan.

---

## 🙏 Kredit

**NIKISTORE WhatsApp Bot**
by Bagas NikiStore — WhatsApp Bot Auto-Store siap pakai untuk jualan otomatis.

> 📣 Join grup kami: **https://bit.ly/NikiStore**
> 📱 Hubungi pemilik: **085171502270**

Semoga berkah! 🇮🇩
