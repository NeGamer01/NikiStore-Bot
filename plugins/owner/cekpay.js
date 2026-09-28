const { getAccountInfo } = require('../../lib/qris')

module.exports = {
  command: ['cekpay', 'cekqrispay'],
  category: 'owner',
  desc: 'Cek koneksi QRISPay Gateway (API key, langganan, channel, saldo)',
  isOwner: true,
  async run({ conn, msg, config }) {
    await conn.sendMessage(msg.from, { text: '⏳ Mengecek QRISPay...' }, { quoted: msg.original })
    try {
      const info = await getAccountInfo()
      const ok = (v) => (v ? '✅' : '❌')
      const sub = info.subscription || {}
      const bal = info.balance || {}
      const channels = Array.isArray(info.allowed_channels) && info.allowed_channels.length
        ? info.allowed_channels.map((c) => c.label || c.provider).join(', ')
        : '-'

      const text =
        `🏦 *QRISPay Gateway*\n▬▬▬▬▬▬▬▬▬▬▬▬\n` +
        `${ok(true)} API key valid\n` +
        `${ok(sub.active)} Langganan ${sub.unlimited ? 'unlimited (admin)' : sub.active ? `aktif s/d ${sub.ends_at || '-'}` : 'TIDAK AKTIF'}\n` +
        `${ok(Boolean(channels !== '-'))} Channel: ${channels}\n` +
        `${sub.tier ? `⚡ Settlement: ${sub.tier === 'H0' ? 'H+0 (realtime)' : 'H+1 (hari berikutnya)'}\n` : ''}` +
        (sub.days_left ? `⏰ Sisa langganan: ${sub.days_left} hari\n` : '') +
        `💰 Saldo gateway: Rp ${String(Number(bal.balance || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}` +
        (bal.held > 0 ? ` (ditahan: Rp ${String(Number(bal.held || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')})` : '') +
        `\n\nURL: ${config.qrispayUrl}` +
        (!sub.active ? `\n\n⚠️ Langganan tidak aktif → pembayaran diblokir (403 SUBSCRIPTION_EXPIRED). Perpanjang di ${config.qrispayUrl}/app` : '')
      await conn.sendMessage(msg.from, { text }, { quoted: msg.original })
    } catch (e) {
      await conn.sendMessage(msg.from, { text: `❌ Gagal: ${e.message}` }, { quoted: msg.original })
    }
  }
}
