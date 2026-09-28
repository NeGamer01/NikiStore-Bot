const { toRupiah } = require('../../lib/digiflazz')
const { readServers, writeServers, getPteroConfig } = require('../../lib/panelStore')

module.exports = {
  command: ['delpanel', 'hapusserver'],
  category: 'owner',
  desc: 'Hapus server panel (owner)',
  isOwner: true,
  async run({ conn, msg, args, config, prefix }) {
    if (!args.length) {
      const servers = readServers()
      if (!servers.length) {
        return conn.sendMessage(msg.from, { text: '📭 Belum ada server yang terjual.' }, { quoted: msg.original })
      }
      let teks = `🖥️ *Daftar Server Panel* (${servers.length})\n\n`
      servers.forEach((s, i) => {
        teks += `*${i + 1}.* ${s.packageLabel} — @${s.userNum}\n   🆔 ${s.idServer ?? '-'} • 👤 ${s.username}\n`
      })
      teks += `\nHapus: *${prefix}delpanel <id_server>*`
      return conn.sendMessage(msg.from, { text: teks }, { quoted: msg.original })
    }

    const idServer = args[0].trim()
    const servers = readServers()
    const target = servers.find(s => String(s.idServer) === idServer || String(s.id) === idServer)
    if (!target) {
      return conn.sendMessage(msg.from, { text: `❌ Server dengan ID *${idServer}* tidak ditemukan. Ketik *${prefix}delpanel* untuk lihat daftar.` }, { quoted: msg.original })
    }

    const p = getPteroConfig()
    if (!p.ptla || !p.domain || !p.apiWrapperUrl) {
      return conn.sendMessage(msg.from, { text: '❌ Config panel belum lengkap. Isi dulu di config.js (ptero.domain, ptero.ptla).' }, { quoted: msg.original })
    }

    // Wrapper lama: GET /api/pterodactyl/delete?domain=&ptla=&idserver=
    const url = `${p.apiWrapperUrl}/api/pterodactyl/delete?domain=${encodeURIComponent(p.domain)}&ptla=${encodeURIComponent(p.ptla)}&idserver=${encodeURIComponent(target.idServer ?? '')}`
    try {
      const res = await require('axios').get(url, { timeout: 30000 })
      const d = res.data
      if (d.status === false || d.error) {
        return conn.sendMessage(msg.from, { text: `❌ Gagal menghapus server: ${d.message || 'error tidak diketahui'}` }, { quoted: msg.original })
      }
      // Hapus dari database lokal
      writeServers(servers.filter(s => s.id !== target.id))
      await conn.sendMessage(msg.from, {
        text: `🗑️ *Server Dihapus*\n\n📦 ${target.packageLabel}\n👤 Username: ${target.username}\n🆔 Server ID: ${target.idServer ?? '-'}\nPemilik: @${target.userNum}\n\n✅ ${d.result?.message || d.message || 'Server berhasil dihapus dari panel.'}`
      }, { quoted: msg.original })
    } catch (e) {
      const d = e?.response?.data
      return conn.sendMessage(msg.from, { text: `❌ Gagal menghubungi API: ${d?.message || e.message}` }, { quoted: msg.original })
    }
  }
}
