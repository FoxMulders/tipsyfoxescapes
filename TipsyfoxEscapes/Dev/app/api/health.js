/** Confirms Vercel routes /api/* to serverless functions. */
export default function handler(_req, res) {
  res.status(200).json({
    ok: true,
    service: "escape-room-builder",
    ts: new Date().toISOString(),
  });
}
