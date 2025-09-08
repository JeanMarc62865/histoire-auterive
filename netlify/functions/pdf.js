// netlify/functions/pdf.js
export default async (req) => {
  try {
    const url = new URL(req.url);
    let src = url.searchParams.get("src");

    if (!src) {
      return new Response("Missing 'src' query parameter", { status: 400 });
    }

    // Vérifie que c’est bien une URL valide
    let target;
    try {
      target = new URL(src);
    } catch {
      return new Response("Invalid 'src' URL", { status: 400 });
    }
    if (!/^https?:$/.test(target.protocol)) {
      return new Response("Only http(s) URLs are allowed", { status: 400 });
    }

    // Télécharge le PDF depuis OneDrive
    const upstream = await fetch(target, { redirect: "follow" });
    if (!upstream.ok) {
      return new Response(`Upstream error (${upstream.status})`, { status: 502 });
    }

    // Prépare la réponse (affichage inline)
    const headers = new Headers(upstream.headers);
    headers.set("Content-Type", "application/pdf");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    const filename = target.pathname.split("/").pop() || "notice.pdf";
    headers.set("Content-Disposition", `inline; filename="${filename}"`);

    return new Response(upstream.body, { status: 200, headers });
  } catch (e) {
    return new Response("Unexpected server error", { status: 500 });
  }
}

