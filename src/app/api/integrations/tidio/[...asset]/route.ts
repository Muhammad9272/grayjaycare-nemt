const TIDIO_ORIGIN = "https://code.tidio.co";
const SAFE_ASSET_PATH = /^[a-zA-Z0-9_./-]+$/;

export async function GET(request: Request, { params }: { params: Promise<{ asset: string[] }> }) {
  const { asset } = await params;
  const assetPath = asset.join("/");
  if (!assetPath || !SAFE_ASSET_PATH.test(assetPath) || assetPath.includes("..")) {
    return new Response("", { status: 404 });
  }

  try {
    const response = await fetch(`${TIDIO_ORIGIN}/${assetPath}`, {
      redirect: "follow",
      next: { revalidate: 3600 },
    });
    if (!response.ok) return new Response("", { status: 502 });

    const upstreamType = response.headers.get("content-type") ?? "application/octet-stream";
    const isJavaScript = upstreamType.includes("javascript") || assetPath.endsWith(".js");
    const body = isJavaScript
      ? (await response.text()).replaceAll(`${TIDIO_ORIGIN}/`, `${new URL(request.url).origin}/api/integrations/tidio/`)
      : await response.arrayBuffer();

    return new Response(body, {
      headers: {
        "Content-Type": upstreamType,
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("", { status: 502 });
  }
}
