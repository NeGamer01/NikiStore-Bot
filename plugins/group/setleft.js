module.exports = {
  command: ['setleft', 'sl'],
  category: 'group',
  desc: 'Atur teks pesan perpisahan (member keluar). Pakai @user untuk mention.',
  isGroup: true,
  isAdmin: true,
  async run({ conn, msg, db, args, text }) {
    const group = db.getGroup(msg.from)

    if (!text || !text.trim()) {
      const cur = group.leftMsg || '_*(belum diatur — pakai default)*_'
      return conn.sendMessage(msg.from, {
        text:
          `📝 *Teks Perpisahan Saat Ini*\n` +
          `▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
          `${cur}\n\n` +
          `*Cara pakai:*\n` +
          `.setleft <teks>\n\n` +
          `*Contoh:*\n` +
          `.setleft Selamat tinggal @user, terima kasih sudah bergabung.\n\n` +
          `💡 *@user* akan otomatis diganti dengan nomor member.\n` +
          `💡 Ketik *.left* untuk mengaktifkan/mematikan pesannya.`
      }, { quoted: msg.original })
    }

    db.setGroup(msg.from, { leftMsg: text.trim() })
    await conn.sendMessage(msg.from, {
      text:
        `✅ *Teks perpisahan disimpan!*\n\n` +
        `${text.trim()}\n\n` +
        `_Ketik *.left* untuk mengaktifkan._`
    }, { quoted: msg.original })
  }
}
