const { getPteroConfig, isPanelConfigured } = require('../../lib/panelStore')

module.exports = {
  command: ['setptero', 'ptero', 'panelconfig'],
  category: 'owner',
  desc: 'Lihat/atur config panel Pterodactyl',
  isOwner: true,
  async run({ conn, msg, args, config, prefix }) {
    // .setptero (tanpa argumen) -> tampilkan config + status
    if (!args.length) {
      const p = getPteroConfig()
      const ok = isPanelConfigured()
      const hidden = (s) => s ? `${s.slice(0, 12)}...${s.slice(-4)}` : '❌ kosong'
      const teks =
        `🖥️ *Config Panel Pterodactyl*\n` +
        `▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
        `*Status:* ${ok ? '✅ Aktif' : '❌ Belum lengkap'}\n\n` +
        `• Domain: *${p.domain || 'kosong'}*\n` +
        `• PTLA: ${hidden(p.ptla)}\n` +
        `• PTLC: ${hidden(p.ptlc)}\n` +
        `• Wrapper: ${p.apiWrapperUrl || 'kosong'}\n` +
        `• Location: ${p.locationId} • Egg: ${p.eggId} • Nest: ${p.nestId}\n\n` +
        (ok
          ? `_Fitur .panel sudah bisa dipakai user._`
          : `_Isi ptla & ptlc di *config.js* (bagian \`ptero\`) supaya fitur .panel bisa dipakai._\n\nContoh:\n\`\`\`js\nptero: {\n  domain: 'panel.kamu.com',\n  ptla: 'ptla_xxxxx',\n  ptlc: 'ptlc_xxxxx',\n  ...\n}\n\`\`\``)
      return conn.sendMessage(msg.from, { text: teks }, { quoted: msg.original })
    }

    // .setptero <field> <nilai> — untuk domain/wrapper/egg/nest/loc saja.
    // ptla/ptlc tetap lewat config.js demi keamanan (tidak disimpan di log chat).
    const field = args[0].toLowerCase()
    const value = args.slice(1).join(' ').trim()
    const allowed = ['domain', 'wrapper', 'egg', 'nest', 'loc']
    if (!allowed.includes(field)) {
      return conn.sendMessage(msg.from, {
        text: `❌ Field tidak valid.\n\nYang bisa diubah dari sini: ${allowed.join(', ')}\n\nUntuk *ptla* & *ptlc*, edit langsung di config.js (alasan keamanan).`
      }, { quoted: msg.original })
    }
    if (!value) {
      return conn.sendMessage(msg.from, { text: `❌ Nilai kosong. Contoh: *${prefix}setptero domain panel.kamu.com*` }, { quoted: msg.original })
    }

    const cfgPath = require.resolve('../../config')
    const cfg = require(cfgPath)
    const map = { domain: 'domain', wrapper: 'apiWrapperUrl', egg: 'eggId', nest: 'nestId', loc: 'locationId' }
    cfg.ptero = cfg.ptero || {}
    cfg.ptero[map[field]] = value

    // Config dimuat via require() — hapus dari cache supaya perubahan terbaca
    delete require.cache[cfgPath]

    return conn.sendMessage(msg.from, {
      text: `✅ Config panel diperbarui.\n\n• ${field} = *${value}*\n\n⚠️ Catatan: perubahan ini hanya berlaku di memori (sampai bot restart).\nUntuk permanen, simpan juga di *config.js*.`
    }, { quoted: msg.original })
  }
}
