// Выдаёт токен для прямой загрузки видео в Vercel Blob из браузера
import { handleUpload } from "@vercel/blob";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  const body = await new Promise((resolve) => {
    let d = "";
    req.on("data", (c) => (d += c));
    req.on("end", () => resolve(d ? JSON.parse(d) : {}));
  });
  try {
    const json = await handleUpload({
      body,
      request: req,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["video/mp4", "video/webm", "video/quicktime"],
        addRandomSuffix: true,
        maximumSizeInBytes: 60 * 1024 * 1024,
      }),
    });
    res.status(200).json(json);
  } catch (e) {
    res.status(400).json({ error: String(e.message || e) });
  }
}
