// netlify/functions/pdf.js
export default async (req) => {
  try {
    const url = new URL(req.url);
    const src = url.searchParams.get("src");
    if (!src) return new Response("Missing 'src' query parameter", { status: 400 });

    let target;
    try { target = new URL(src); }
    catch { return new Response("Invalid 'src' URL", { status: 400 }); }
    if (!/^https?:$/.test(target.protocol)) {
      return new Response("Only http(s) URLs are allowed", { status: 400 });
    }

    const isOD = /onedrive\.live\.com|sharepoint\.com|(^|\.)1drv\.ms$/i.test(target.hostname);

    // Prépare des en-têtes "comme un navigateur" + Referer
    const uaHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept": "application/pdf,*/*;q=0.9",
      "Referer": isOD ? "https://onedrive.live.com/" : req.headers.get("referer") || ""
    };

    // 1) Tenter le STREAMING (pour éviter toute page OneDrive)
    //    On suit les redirections automatiquement. Si 403 → on bascule en fallback.
    let streamOk = false;
    let upstream;
    if (isOD) {
      try {
        upstream = await fetch(target, { redirect: "follow", headers: uaHeaders });
        // Si OneDrive renvoie quelque chose de type PDF, on stream
        const ctype = upstream.headers.get("content-type") || "";
        if (upstream.ok && ctype.toLowerCase().includes("pdf")) {
          const headers = new Headers();
          headers.set("Content-Type", "application/pdf");
          headers.set("Cache-Control", "public, max-age=31536000, immutable");
          headers.set("Content-Disposition", 'inline; filename="notice.pdf"');
          streamOk = true;
          return new Response(upstream.body, { status: 200, headers });
        }
      } catch {
        // ignore, on passera au fallback
      }
    }

    // 2) Fallback : redirection vers une URL "download=1"
    //    - Résoudre d'abord les liens courts 1drv.ms
    let resolved = target;
    if (isOD && /(^|\.)1drv\.ms$/i.test(target.hostname)) {
      let hop = target;
      for (let i = 0; i < 6; i++) {
        const resp = await fetch(hop, { method: "HEAD", redirect: "manual", headers: uaHeaders });
        const loc = resp.headers.get("location");
        if (!loc) break;
        hop = new URL(loc, hop);
        if (/sharepoint\.com|onedrive\.live\.com/i.test(hop.hostname)) break;
      }
      resolved = hop;
    }

    // Forcer le téléchargement direct quand c'est possible
    const final = new URL(resolved.toString());
    if (isOD) {
      if (final.searchParams.has("download")) final.searchParams.set("download", "1");
      else final.search += (final.search ? "&" : "?") + "download=1";
    }

    return Response.redirect(final.toString(), 302);
  } catch (e) {
    return new Response("Unexpected server error", { status: 500 });
  }
}

