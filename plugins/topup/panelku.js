const { toRupiah } = require('../../lib/digiflazz')
const { getServersByUser, isPanelConfigured } = require('../../lib/panelStore')

module.exports = {
  command: ['panelku', 'serverku', 'myserver'],
  category: 'topup',
  desc: 'Lihat server panel yang sudah dibeli',
  async run({ conn, msg, db, config, prefix }) {
    if (!isPanelConfigured()) {
      return conn.sendMessage(msg.from, {
        text: '⚠️ Panel store belum dibuka oleh owner.'
      }, { quoted: msg.original })
    }

    const servers = getServersByUser(msg.sender)
    if (!servers.length) {
      return conn.sendMessage(msg.from, {
        text: `📭 Kamu belum punya server panel.\n\nKetik *${prefix}panel* untuk melihat paket yang tersedia! 🖥️`
      }, { quoted: msg.original })
    }

    let teks = `🖥️ *Server Panel Kamu* (${servers.length})\n`
    teks += `▬▬▬▬▬▬▬▬▬▬▬▬▬\n`
    for (const s of servers) {
      teks += `\n📦 *${s.packageLabel}*\n`
      teks += `🌐 ${s.panelUrl}\n`
      teks += `👤 Username: *${s.username}*\n`
      teks += `🔑 Password: *${s.password}*\n`
      teks += `🆔 Server ID: ${s.idServer ?? '-'}\n`
      teks += `🕒 Dibeli: ${new Date(s.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}\n`
    }
    teks += `\n⚠️ _Jangan bagikan password ke siapapun._\n_${config.botName}_`

    return conn.sendMessage(msg.from, { text: teks }, { quoted: msg.original })
  }
}
