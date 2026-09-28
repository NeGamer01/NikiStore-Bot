// lib/panelStore.js — Jualan server Pterodactyl dari WhatsApp
//
// Alur singkat:
//   .panel            -> user pilih paket (lihat plugins/topup/panel.js)
//   konfirmasi 'ya'   -> jika saldo cukup: langsung buat server (createPanelServer)
//                        jika tidak: buat QRIS via QRISPay, lalu polling
//                        checkStatus -> createPanelServer
//
// Server dibuat via API wrapper (config.ptero.apiWrapperUrl) dengan parameter
// query string persis seperti referensi project panel/:
//   GET /api/pterodactyl/create?domain=&ptla=&ptlc=&loc=&eggid=&nestid=
//                              &ram=&disk=&cpu=&username=
//
// Response sukses (lihat panel/out.json):
//   { status: true, result: { id_user, id_server, username, password, ram,
//                            disk, cpu, domain, created_at } }
//
// Username panel harus unik per akun Pterodactyl. Kita generate dari nomor WA
// user + sufiks acak, lalu disimpan di user.servers[] supaya user bisa
// lihat lagi lewat .panelku.

const axios = require('axios')
const fs = require('fs')
const path = require('path')
const { toRupiah } = require('./digiflazz')
const { sendOwnerNotify } = require('./ownerNotify')
const txLogger = require('./transactionLogger')

const SERVERS_PATH = path.join(__dirname, '..', 'database', 'panel_servers.json')

function getConfig() {
  return require('../config')
}

/**
 * Ambil konfigurasi Pterodactyl dari config.js.
 * Bersihkan ptlc: pola 'ptlc_xxx&#x26;loc=1' (HTML-escaped) dan
 * 'ptlc_xxx&loc=1' (caret mentah, tanpa escape) dua-duanya didukung.
 */
function getPteroConfig() {
  const config = getConfig()
  const p = config.ptero || {}
  const domain = String(p.domain || '').trim()
  const ptla = String(p.ptla || '').trim()
  let ptlc = String(p.ptlc || '').trim()
  ptlc = ptlc.replace(/&#x26;/g, '&').replace(/&amp;/g, '&') // unescape &
  // Buang sufiks '&loc=...' yang ikut tertangkap saat key di-copy mentah
  // dari panel — loc yang sah diatur oleh config.ptero.locationId.
  ptlc = ptlc.replace(/&loc=\d+\s*$/, '')

  return {
    domain,
    ptla,
    ptlc,
    apiWrapperUrl: String(p.apiWrapperUrl || '').trim().replace(/\/$/, ''),
    locationId: String(p.locationId || '1').trim(),
    eggId: String(p.eggId || '').trim(),
    nestId: String(p.nestId || '').trim()
  }
}

/** true jika config panel sudah lengkap (ptla & ptlc terisi). */
function isPanelConfigured() {
  const p = getPteroConfig()
  return !!(p.domain && p.ptla && p.ptlc && p.apiWrapperUrl)
}

/** Paket panel berdasarkan id (lihat config.panelPackages). */
function getPackage(id) {
  const config = getConfig()
  return (config.panelPackages || []).find(pkg => pkg.id === id)
}

/** Semua paket, urut termurah. */
function getAllPackages() {
  const config = getConfig()
  return [...(config.panelPackages || [])].sort((a, b) => a.hargaJual - b.hargaJual)
}

/** Username panel unik: dari nomor WA + sufiks pendek. */
function makeUsername(sender, salt) {
  const num = String(sender || '').replace(/[^0-9]/g, '').slice(-8)
  const s = String(salt || Math.random().toString(36).slice(2, 6)).toLowerCase()
  return `u${num}${s}`.slice(0, 16) // maks 16 char (syarat Pterodactyl)
}

/**
 * Buat server Pterodactyl via API wrapper.
 * @param {object} pkg          Objek paket dari config.panelPackages
 * @param {string} username     Username panel (harus unik)
 * @returns {Promise<object>}   { success, data: { idServer, username, password,
*                                 ram, disk, cpu, panelUrl }, message }
*/
async function createPanelServer(pkg, username) {
  const p = getPteroConfig()
  if (!isPanelConfigured()) {
    return { success: false, message: 'Panel belum dikonfigurasi owner. Ketik .setptero untuk lihat cara setting.' }
  }

  // ram/disk/cpu bertipe number di paket (lihat config.js). Jika suatu saat
  // ada nilai 'unlimited', kirim 0 ke API sesuai konvensi panel.
  const val = (n) => (String(n).toLowerCase() === 'unlimited' ? 0 : Number(n))

  const params = new URLSearchParams({
    domain: p.domain,
    ptla: p.ptla,
    ptlc: p.ptlc,
    loc: p.locationId || '1',
    eggid: p.eggId,
    nestid: p.nestId,
    ram: String(val(pkg.ram)),
    disk: String(val(pkg.disk)),
    cpu: String(val(pkg.cpu)),
    username
  })

  const url = `${p.apiWrapperUrl}/api/pterodactyl/create?${params.toString()}`
  console.log('[PANEL] create ->', url.replace(/ptla=[^&]+/, 'ptla=***').replace(/ptlc=[^&]+/, 'ptlc=***'))

  let data
  let rawText = ''
  try {
    const res = await axios.get(url, { timeout: 30000, responseType: 'text' })
    rawText = String(res.data || '')
    // Wrapper apiku-niki memakai res.json(...) / res.send(...) tanpa selalu
    // mengirim Content-Type: application/json, jadi responsnya bisa berupa
    // string JSON mentah. Kalau itu terjadi, parse manual.
    try { data = JSON.parse(rawText) } catch (e) { data = rawText }
  } catch (e) {
    const d = e?.response?.data
    const msg = d?.message || e?.message || 'Gagal menghubungi API pembuatan server.'
    return { success: false, message: msg, details: d }
  }

  // ── Validasi sukses ────────────────────────────────────────────
  // Wrapper yang benar mengirim: { status: true, result: { id_server, ... } }
  // Kalau bukan itu, anggap gagal. Penyebab umum:
  //  1. Error panel Pterodactyl 403 "This action is unauthorized"
  //     -> API key ptla tidak punya izin 'user.create' / 'server.create'.
  //  2. Error 404 di /api/application/nests/.../eggs/...
  //     -> eggId/nestId salah.
  //  3. Wrapper balas string biasa ("Isi Parameternya!") -> parameter kurang.
  const errMsg = (obj) => {
    if (!obj) return ''
    if (typeof obj === 'string') return obj
    if (typeof obj === 'object') {
      // Format error Pterodactyl: { errors: [ { code, status, detail } ] }
      const errs = obj.errors
      if (Array.isArray(errs) && errs.length) {
        const e0 = errs[0]
        return `${e0.code || 'Error'} ${e0.status ? `(${e0.status})` : ''}: ${e0.detail || e0.message || ''}`
      }
      return obj.message || obj.detail || obj.error || JSON.stringify(obj).slice(0, 300)
    }
    return String(obj)
  }

  const isStringResponse = typeof data === 'string'
  const hasResult = !isStringResponse && data && typeof data === 'object' && !!data.result

  if (isStringResponse || !data || data.status === false || data.error || data.errors || !hasResult) {
    const msg = errMsg(data) || 'Gagal membuat server (panel error).'
    console.error('[PANEL] create GAGAL. Raw response:', rawText.slice(0, 500))
    return { success: false, message: msg, details: isStringResponse ? rawText.slice(0, 500) : data }
  }

  // Wrapper lama (Skyzopedia) mengembalikan { status, result: {...} }
  const result = data.result || data.data || data
  const panelUrl = `https://${p.domain}`

  return {
    success: true,
    message: 'Server berhasil dibuat.',
    data: {
      idServer: result.id_server ?? result.idServer ?? null,
      idUser: result.id_user ?? null,
      username: result.username || username,
      password: result.password || null,
      ram: result.ram ?? pkg.ram,
      disk: result.disk ?? pkg.disk,
      cpu: result.cpu ?? pkg.cpu,
      panelUrl,
      createdAt: result.created_at || new Date().toISOString()
    }
  }
}

// ─── Penyimpanan server yang sudah dibeli (database/panel_servers.json) ───

function readServers() {
  try {
    if (!fs.existsSync(SERVERS_PATH)) return []
    return JSON.parse(fs.readFileSync(SERVERS_PATH, 'utf-8'))
  } catch (e) { return [] }
}

function writeServers(list) {
  try {
    fs.writeFileSync(SERVERS_PATH, JSON.stringify(list, null, 2))
  } catch (e) { console.error('[PANEL] Gagal simpan panel_servers.json:', e.message) }
}

/** Semua server milik user (berdasarkan nomor WA canonical). */
function getServersByUser(sender) {
  const num = String(sender || '').replace(/[^0-9]/g, '')
  return readServers().filter(s => String(s.userNum || '') === num)
}

/** Catat server baru ke database. */
function saveServer(sender, pkg, data) {
  const list = readServers()
  const entry = {
    id: Date.now().toString(36),
    userNum: String(sender || '').replace(/[^0-9]/g, ''),
    packageId: pkg.id,
    packageLabel: pkg.label,
    hargaJual: pkg.hargaJual,
    hargaModal: pkg.hargaModal,
    idServer: data.idServer,
    username: data.username,
    password: data.password,
    ram: data.ram, disk: data.disk, cpu: data.cpu,
    panelUrl: data.panelUrl,
    createdAt: Date.now()
  }
  list.unshift(entry)
  writeServers(list)
  return entry
}

/**
 * Terjemahkan error panel/wrapper ke bahasa manusia.
 * Error 403 "This action is unauthorized" artinya API KEY ptla tidak punya
 * izin yang dibutuhkan — bukan salah user, dan tidak bisa diperbaiki dari sini.
 */
function terjemahkanError(err) {
  if (!err) return ''
  let s = ''
  if (typeof err === 'string') s = err
  else if (typeof err === 'object') {
    if (Array.isArray(err.errors) && err.errors[0]) s = JSON.stringify(err.errors[0])
    else s = err.message || err.detail || JSON.stringify(err)
  } else s = String(err)

  const lower = s.toLowerCase()

  if (lower.includes('accessdeniedhttpexception') || (lower.includes('unauthorized') && lower.includes('403'))) {
    return 'API key panel (ptla) tidak punya izin untuk membuat server/user. Owner harus regenerate API key dengan permission yang lengkap di panel Pterodactyl (Application API, centang semua permission user & server).'
  }
  if (lower.includes('notfoundhttpexception') || lower.includes('404')) {
    if (lower.includes('egg') || lower.includes('nest')) {
      return 'Egg/Nest tidak ditemukan di panel. Cek config eggId & nestId (ketik .setptero).'
    }
    return 'Endpoint panel tidak ditemukan (404). Cek config domain panel.'
  }
  if (lower.includes('validation')) return 'Data server ditolak panel (validasi). Cek username/paket.'
  if (lower.includes('isi parameternya') || lower.includes('parameter')) {
    return 'Parameter belum lengkap. Hubungi owner untuk cek config panel.'
  }
  if (lower.includes('timeout') || lower.includes('etimedout')) {
    return 'Panel tidak merespons (timeout). Coba lagi nanti.'
  }
  if (lower.includes('enotfound') || lower.includes('getaddrinfo')) {
    return 'Domain panel tidak ditemukan. Owner cek config domain (ketik .setptero).'
  }
  return s.slice(0, 200)
}

/**
 * Proses setelah pembayaran LUNAS (saldo atau QRIS): buat server, kirim
 * kredensial ke user + notifikasi owner, catat transaksi.
 */
async function prosesPembelianPanel(sender, pkg, { db, conn, from, quotedMsg, via, username }) {
  const config = getConfig()
  const user = db.getUser(sender)

  // Buat server (username dikirim user, fallback ke otomatis kalau kosong)
  const namaUser = (username && String(username).trim()) ? String(username).trim() : makeUsername(sender)

  // Buat server
  const hasil = await createPanelServer(pkg, namaUser)

  if (!hasil.success) {
    // Gagal membuat server (bukan salah user) -> kembalikan uang
    db.setUser(sender, { saldo: (db.getUser(sender).saldo || 0) + pkg.hargaJual })
    // Terjemahkan error panel ke bahasa manusia supaya user & owner paham
    const alasan = terjemahkanError(hasil.details) || terjemahkanError(hasil.message)
    const teks =
      `❌ *Pembuatan Server Gagal*\n` +
      `▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
      `*Paket:* ${pkg.label}\n\n` +
      `💰 Uang kamu dikembalikan: Rp ${toRupiah(pkg.hargaJual)}\n` +
      `*Saldo kamu:* Rp ${toRupiah(db.getUser(sender).saldo)}\n\n` +
      (alasan ? `📋 *Penyebab:* ${alasan}\n\n` : '') +
      `_Silakan coba lagi atau hubungi admin._`
    await conn.sendMessage(from, { text: teks }, { quoted: quotedMsg }).catch(() => {})
    await sendOwnerNotify(conn,
      `❌ *Panel Gagal Dibuat*\nPaket: ${pkg.label}\nUser: @${sender.split('@')[0]}\nAlasan: ${alasan || hasil.message}\nDetail: ${JSON.stringify(hasil.details || {}).slice(0, 300)}\nUang direfund otomatis.`,
      [sender])
    txLogger.log({
      type: 'panel',
      status: 'gagal',
      user: sender,
      produk: pkg.label,
      packageId: pkg.id,
      hargaJual: pkg.hargaJual,
      hargaModal: pkg.hargaModal,
      profit: 0
    })
    return { success: false }
  }

  // Simpan server
  const entry = saveServer(sender, pkg, hasil.data)

  // Kirim kredensial ke user
  const d = hasil.data
  const teks =
    `✅ *Server Panel Berhasil Dibuat!*\n` +
    `▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
    `*Paket:* ${pkg.label}\n` +
    `*RAM:* ${d.ram} MB • *Disk:* ${d.disk} MB • *CPU:* ${d.cpu}%\n\n` +
    `🌐 *Link Panel:*\n${d.panelUrl}\n\n` +
    `👤 *Username:* ${d.username}\n` +
    `🔑 *Password:* ${d.password}\n\n` +
    `⚠️ _Simpan data ini baik-baik. Ketik *${config.prefix}panelku* untuk lihat lagi._\n` +
    `_${config.botName}_`

  try {
    await conn.sendMessage(from, { text: teks }, { quoted: quotedMsg })
  } catch (e) {
    await conn.sendMessage(from, { text: teks })
  }

  // Notifikasi owner
  const profit = pkg.hargaJual - pkg.hargaModal
  await sendOwnerNotify(conn,
    `🖥️ *Server Panel Terjual*\nPaket: ${pkg.label} (${pkg.ram}MB/${pkg.disk}MB/${pkg.cpu}%)\nHarga: Rp ${toRupiah(pkg.hargaJual)} • Modal: Rp ${toRupiah(pkg.hargaModal)} • Profit: Rp ${toRupiah(profit)}\nUsername: ${d.username}\nServer ID: ${d.idServer ?? '-'}\nUser: @${sender.split('@')[0]}`,
    [sender])

  // Log transaksi
  txLogger.log({
    type: 'panel',
    status: 'sukses',
    user: sender,
    produk: pkg.label,
    packageId: pkg.id,
    hargaJual: pkg.hargaJual,
    hargaModal: pkg.hargaModal,
    profit,
    idServer: d.idServer,
    username: d.username
  })

  // Notifikasi promo grup
  if (config.promoGroupJid) {
    try {
      await conn.sendMessage(config.promoGroupJid, {
        text: `🎉 *Server Panel Terjual!*\n\n🖥️ *${pkg.label}*\n✅ Server baru saja dibuat\n\n🙏 Terima kasih sudah membeli panel di *${config.botName}*!\n\n_Mau panel sendiri? Ketik *${config.prefix}panel*_`
      })
    } catch (e) { console.error('[PANEL] Gagal kirim notif grup:', e.message) }
  }

  // Simpan ke riwayat user
  const riwayat = user.riwayat || []
  riwayat.unshift({
    type: 'panel',
    status: 'sukses',
    produk: pkg.label,
    hargaJual: pkg.hargaJual,
    server: d.idServer,
    username: d.username,
    waktu: Date.now()
  })
  db.setUser(sender, { riwayat: riwayat.slice(0, 50) })

  return { success: true, data: hasil.data, entry }
}

module.exports = {
  getPteroConfig,
  isPanelConfigured,
  getPackage,
  getAllPackages,
  makeUsername,
  createPanelServer,
  prosesPembelianPanel,
  getServersByUser,
  saveServer,
  readServers,
  writeServers,
  terjemahkanError
}
