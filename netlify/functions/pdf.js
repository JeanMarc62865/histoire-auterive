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

    // Si ce n'est pas OneDrive/SharePoint, on redirige tel quel.
    const isOD = /onedrive\.live\.com|sharepoint\.com|1drv\.ms/i.test(target.hostname);
    if (!isOD) {
      return Response.redirect(target.toString(), 302);
    }

    // Force le téléchargement direct (évite le viewer + contourne les 403 côté proxy)
    if (target.searchParams.has("download")) {
      target.searchParams.set("download", "1");
    } else {
      target.search += (target.search ? "&" : "?") + "download=1";
    }

    // Redirige le navigateur vers l'URL finale (le navigateur suivra toutes les redirections OneDrive)
    return Response.redirect(target.toString(), 302);
  } catch (e) {
    return new Response("Unexpected server error", { status: 500 });
  }
}

