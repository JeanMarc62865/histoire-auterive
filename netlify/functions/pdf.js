
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

    // Si ce n’est pas OneDrive/SharePoint, on redirige tel quel.
    const isODHost = /onedrive\.live\.com|sharepoint\.com|1drv\.ms/i.test(target.hostname);
    if (!isODHost) {
      return Response.redirect(target.toString(), 302);
    }

    // 1) Résoudre les liens courts 1drv.ms -> obtenir l'URL SharePoint finale (sans télécharger le PDF)
    let resolved = target;
    const looksShort = /(^|\.)1drv\.ms$/i.test(target.hostname);

    if (looksShort) {
      // HEAD avec redirections MANUELLES pour récupérer l'en-tête Location
      const uaHeaders = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept": "*/*"
      };

      // On suit au plus 5 redirections sans jamais télécharger le contenu
      let hop = target;
      for (let i = 0; i < 5; i++) {
        const resp = await fetch(hop, { method: "HEAD", redirect: "manual", headers: uaHeaders });
        const loc = resp.headers.get("location");
        if (!loc) break;
        const next = new URL(loc, hop);
        hop = next;
        // Arrêt si on atteint sharepoint/onedrive
        if (/sharepoint\.com|onedrive\.live\.com/i.test(hop.hostname)) break;
      }
      resolved = hop;
    }

    // 2) Forcer le téléchargement direct (évite le viewer)
    const final = new URL(resolved.toString());
    if (final.searchParams.has("download")) {
      final.searchParams.set("download", "1");
    } else {
      final.search += (final.search ? "&" : "?") + "download=1";
    }

    // 3) Redirection 302 vers l’URL finale (le navigateur suivra ensuite)
    return Response.redirect(final.toString(), 302);
  } catch (e) {
    return new Response("Unexpected server error", { status: 500 });
  }
}
