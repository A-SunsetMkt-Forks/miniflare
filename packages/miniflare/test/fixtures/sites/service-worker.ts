import { getAssetFromKV } from "@cloudflare/kv-asset-handler";

addEventListener("fetch", (event) => {
  event.respondWith(
    getAssetFromKV(event).catch(
      (err) => new Response(err.stack, { status: err.status ?? 500 })
    )
  );
});
