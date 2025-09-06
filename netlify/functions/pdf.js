export default async (req) => {
  const url = new URL(req.url);
  const target = url.searchParams.get("src");
  if (!target) return new Response("Missing src", { status: 400 });

  const upstream = await fetch(target, { redirect: "follow" });
  if (!upstream.ok) return new Response("Upstream error", { status: upstream.status });

  const headers = new Headers(upstream.headers);
  headers.set("Content-Type", "application/pdf");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  return new Response(upstream.body, { status: 200, headers });
};

