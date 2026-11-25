// Принимает данные заявки, шлёт альбом фото + видео в Telegram, удаляет Blob
export const config = { maxDuration: 60 };

const b64toBlob = (b64, type = "image/jpeg") => {
  const buf = Buffer.from(b64.split(",")[1] || b64, "base64");
  return new Blob([buf], { type });
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  const s = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

  const caption = [
    s.manual ? "⚠️ ФОТО ВРУЧНУЮ — проверить внимательно" : "✅ Проверка лица пройдена",
    `👤 ${s.fio}`,
    `✉️ ${s.email}`,
    `🏠 Квартира: ${s.apt}`,
    `yaw: ${JSON.stringify(s.yawValues)}`,
    `pitch: ${JSON.stringify(s.pitchValues)}`,
  ].join("\n");

  const form = new FormData();
  const photos = [
    { key: "p0", data: s.facePhoto, caption },
    { key: "p1", data: s.doc1 },
    { key: "p2", data: s.doc2 },
  ].filter(p => p.data);
  form.append("media", JSON.stringify(photos.map((p, i) => ({
    type: "photo", media: `attach://${p.key}`, ...(i === 0 ? { caption } : {}),
  }))));
  for (const p of photos) form.append(p.key, b64toBlob(p.data));

  const tg = async (method, payload) => {
    const r = await fetch(`https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/${method}`, { method: "POST", body: payload });
    return r.json();
  };

  try {
    await tg("sendMediaGroup", Object.assign(form, { force: true })); // альбом
    if (s.videoUrl) {
      const vf = new FormData();
      vf.append("chat_id", process.env.TG_CHAT_ID);
      vf.append("video", s.videoUrl);
      vf.append("caption", `Видео проверки лица — ${s.fio}`);
      await tg("sendVideo", vf);
      // удаляем видео из Blob
      await fetch(`https://api.vercel.com/v2/blob/${encodeURIComponent(s.videoUrl.split("/").pop().split("?")[0])}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
      }).catch(() => {});
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
