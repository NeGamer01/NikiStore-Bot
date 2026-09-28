const { getAllPackages, getPackage, isPanelConfigured } = require('../../lib/panelStore')
const { toRupiah } = require('../../lib/digiflazz')

// ─── Tahap 1: tampilkan spek paket, minta user kirim username ───
// Function declaration (hoisted) supaya bisa dirujuk dari module.exports di
// bawah. Jangan diubah jadi arrow-function const.
async function konfirmasiPembelian(conn, msg, db, config, prefix, pkg) {
  const from = msg.from
  const sender = msg.sender
  const user = db.getUser(sender)
  const saldo = user.saldo || 0

  db.setUser(sender, {
    pendingPanel: { packageId: pkg.id, hargaJual: pkg.hargaJual, via: 'saldo', createdAt: Date.now() }
  })

  return conn.sendMessage(from, {
    text:
      `🛒 *Detail Pesanan Panel*\n` +
      `▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
      `*Paket:* ${pkg.label}\n` +
      `*Spesifikasi:*\n` +
      `   💾 RAM : ${pkg.ram} MB\n` +
      `   💽 Disk : ${pkg.disk} MB\n` +
      `   ⚙️ CPU : ${pkg.cpu}%\n\n` +
      `*Harga:* Rp ${toRupiah(pkg.hargaJual)}\n` +
      `*Saldo kamu:* Rp ${toRupiah(saldo)}\n\n` +
      `✍️ *Langkah selanjutnya:*\n` +
      `Kirim *username* untuk server kamu (contoh: serverku).\n\n` +
      `⚠️ Username minimal 3 huruf, maksimal 16 huruf, tanpa spasi.\n\n` +
      `Ketik *batal* untuk membatalkan.`
  }, { quoted: msg.original })
}

// ─── Tahap 2: username sudah ada, saldo kurang -> bayar QRIS dulu ───
// Dipanggil dari index1.js setelah user kirim username & saldo terbukti kurang.
async function bayarQrisPanel(conn, msg, db, config, prefix, pkg, username) {
  const from = msg.from
  const sender = msg.sender
  const { createQris, getQrisImage, checkStatus } = require('../../lib/qris')
  const { prosesPembelianPanel } = require('../../lib/panelStore')

  const kurang = pkg.hargaJual - (db.getUser(sender).saldo || 0)
  await conn.sendMessage(from, {
    text: `⚠️ *Saldo tidak cukup* (kekurangan Rp ${toRupiah(kurang)}).\n\n⏳ Membuat QRIS...`
  }, { quoted: msg.original })

  const baseAmount = pkg.hargaJual
  const createdAt = Date.now()

  let qris
  try {
    qris = await createQris(baseAmount, `PANEL-${pkg.id}-${sender.split('@')[0]}-${createdAt}`)
  } catch (e) {
    return conn.sendMessage(from, { text: `❌ Gagal membuat QRIS: ${e.message}` }, { quoted: msg.original })
  }
  const amount = qris.amount
  const qrisImage = await getQrisImage(qris)

  // Username disimpan dulu — setelah bayar sukses, server dibuat dengannya
  db.setUser(sender, {
    pendingPanel: { packageId: pkg.id, hargaJual: pkg.hargaJual, via: 'qris', amount, createdAt, qrisId: qris.qrisId, username }
  })

  const infoMsg = await conn.sendMessage(from, {
    text:
      `💳 *Pembayaran QRIS — Panel*\n` +
      `▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
      `*Paket:* ${pkg.label}\n` +
      `*Spesifikasi:* RAM ${pkg.ram}MB • Disk ${pkg.disk}MB • CPU ${pkg.cpu}%\n` +
      `*Username:* ${username}\n` +
      `*Bayar:* Rp ${toRupiah(amount)}\n\n` +
      `⚠️ Bayar TEPAT *Rp ${toRupiah(amount)}*\n` +
      `⏰ Berlaku *5 menit*`
  }, { quoted: msg.original })
  const qrisMsg = await conn.sendImage(from, qrisImage, `Bayar Rp ${toRupiah(amount)} — Berlaku 5 menit`, msg.original)

  const maxWait = 5 * 60 * 1000
  const interval = 5000
  let elapsed = 0
  const poll = setInterval(async () => {
    elapsed += interval
    if (elapsed >= maxWait) {
      clearInterval(poll)
      db.setUser(sender, { pendingPanel: null })
      if (qrisMsg?.key) await conn.sendMessage(from, { delete: qrisMsg.key }).catch(() => {})
      if (infoMsg?.key) await conn.sendMessage(from, { delete: infoMsg.key }).catch(() => {})
      return conn.sendMessage(from, { text: '⏰ Waktu pembayaran habis. Silakan order ulang.' })
    }
    try {
      const st = await checkStatus(qris.qrisId)
      if (st.status === 'EXPIRED') {
        clearInterval(poll)
        db.setUser(sender, { pendingPanel: null })
        if (qrisMsg?.key) await conn.sendMessage(from, { delete: qrisMsg.key }).catch(() => {})
        if (infoMsg?.key) await conn.sendMessage(from, { delete: infoMsg.key }).catch(() => {})
        return conn.sendMessage(from, { text: '⏰ QRIS sudah kadaluarsa. Silakan order ulang.' })
      }
      if (st.paid) {
        clearInterval(poll)
        const order = db.getUser(sender).pendingPanel
        db.setUser(sender, { pendingPanel: null })
        if (!order) return
        if (qrisMsg?.key) await conn.sendMessage(from, { delete: qrisMsg.key }).catch(() => {})
        if (infoMsg?.key) await conn.sendMessage(from, { delete: infoMsg.key }).catch(() => {})
        await prosesPembelianPanel(sender, pkg, { db, conn, from, quotedMsg: msg.original, via: 'qris', username })
      }
    } catch (e) { /* lanjut polling */ }
  }, interval)
}

module.exports = {
  command: ['panel', 'belipanel', 'server'],
  category: 'topup',
  desc: 'Beli server Pterodactyl (panel)',
  // Dipanggil oleh handler list message di index1.js (rowId: order_panel_<id>)
  konfirmasiPembelianPanel: konfirmasiPembelian,
  // Dipanggil index1.js kalau saldo kurang & user sudah kirim username
  bayarQrisPanel,
  async run({ conn, msg, args, db, config, prefix, isGroup }) {
    const from = msg.from
    const sender = msg.sender

    if (!isPanelConfigured()) {
      return conn.sendMessage(from, {
        text: '⚠️ *Panel Store belum dibuka.*\n\nOwner belum mengatur panel Pterodactyl. Tunggu pengumuman selanjutnya ya! 🙏'
      }, { quoted: msg.original })
    }

    const paket = getAllPackages()
    if (!paket.length) {
      return conn.sendMessage(from, { text: '⚠️ Belum ada paket panel yang tersedia.' }, { quoted: msg.original })
    }

    // Langsung ke checkout kalau user ketik: .panel panel2
    const pilih = args[0] ? getPackage(args[0].toLowerCase()) : null
    if (pilih) return konfirmasiPembelian(conn, msg, db, config, prefix, pilih)

    const user = db.getUser(sender)
    const device = user.device || 'ios'
    const saldo = user.saldo || 0

    const header =
      `🖥️ *PANEL STORE*\n` +
      `Mau punya server sendiri (Minecraft, Discord bot, dll)?\n` +
      `Pilih paket di bawah, bayar, server langsung dibuatkan!\n\n` +
      `💰 Saldo kamu: *Rp ${toRupiah(saldo)}*`

    const footer = `${config.botName} | ${prefix}panel <paket>`

    const rows = paket.map(p => ({
      id: `order_panel_${p.id}`,
      title: `🖥️ ${p.label}`,
      description: `RAM ${p.ram}MB • Disk ${p.disk}MB • CPU ${p.cpu}% — Rp ${toRupiah(p.hargaJual)}`
    }))

    if (device === 'android' && !isGroup) {
      // List interaktif (maks 10 row per section)
      const sections = [{ title: '🖥️ Pilih Paket Panel', rows }]
      return conn.sendList(from, '🖥️ Panel Store', header, footer, '📋 Pilih Paket', sections, msg)
    }

    // Menu teks (iOS / universal)
    let teks = `🖥️ *PANEL STORE*\n\nMau punya server sendiri (Minecraft, Discord bot, dll)? Bayar, server langsung dibuatkan!\n\n💰 Saldo kamu: *Rp ${toRupiah(saldo)}*\n\n`
    teks += `*— Pilih Paket —*\n`
    paket.forEach((p, i) => {
      teks += `*${i + 1}.* ${p.label}\n   💰 Rp ${toRupiah(p.hargaJual)} — RAM ${p.ram}MB • Disk ${p.disk}MB • CPU ${p.cpu}%\n   ➡️ *${prefix}panel ${p.id}*\n\n`
    })
    teks += `_Ketik ${prefix}panelku untuk melihat server yang sudah kamu beli._`
    return conn.sendMessage(from, { text: teks.trim() }, { quoted: msg.original })
  }
}
