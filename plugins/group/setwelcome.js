module.exports = {
  command: ['setwelcome', 'sw'],
  category: 'group',
  desc: 'Atur teks pesan welcome grup. Pakai @user untuk mention member baru.',
  isGroup: true,
  isAdmin: true,
  async run({ conn, msg, db, args, text }) {
    const group = db.getGroup(msg.from)

    // Tanpa teks -> tampilkan teks sekarang + contoh
    if (!text || !text.trim()) {
      const cur = group.welcomeMsg || '_*(belum diatur — pakai default)*_'
      return conn.sendMessage(msg.from, {
        text:
          `📝 *Teks Welcome Saat Ini*\n` +
          `▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
          `${cur}\n\n` +
          `*Cara pakai:*\n` +
          `.setwelcome <teks>\n\n` +
          `*Contoh:*\n` +
          `.setwelcome Selamat datang @user di grup kami! Jangan lupa baca deskripsi.\n\n` +
          `💡 *@user* akan otomatis diganti dengan nomor member baru.\n` +
          `💡 Ketik *.welcome* untuk mengaktifkan/mematikan pesannya.`
      }, { quoted: msg.original })
    }

    db.setGroup(msg.from, { welcomeMsg: text.trim() })
    await conn.sendMessage(msg.from, {
      text:
        `✅ *Teks welcome disimpan!*\n\n` +
        `${text.trim()}\n\n` +
        `_Ketik *.welcome* untuk mengaktifkan._`
    }, { quoted: msg.original })
  }
}
