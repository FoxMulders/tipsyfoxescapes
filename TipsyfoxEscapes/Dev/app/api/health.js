/** Confirms Vercel routes /api/* to serverless functions. */
export default function handler(_req, res) {
  const body = JSON.stringify({
    ok: true,
    service: "escape-room-builder",
    ts: new Date().toISOString(),
  });
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(body);
}
