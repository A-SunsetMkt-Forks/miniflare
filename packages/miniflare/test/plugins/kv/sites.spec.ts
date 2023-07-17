import fs from "fs/promises";
import path from "path";
import test from "ava";
import esbuild from "esbuild";
import { Miniflare } from "miniflare";
import { useTmp } from "../../test-shared";

const FIXTURES_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "test",
  "fixtures",
  "sites"
);
const SERVICE_WORKER_ENTRY_PATH = path.join(FIXTURES_PATH, "service-worker.ts");
const MODULES_ENTRY_PATH = path.join(FIXTURES_PATH, "modules.ts");

test("supports Workers Sites", async (t) => {
  // Build fixtures
  const tmp = await useTmp(t);
  await esbuild.build({
    entryPoints: [SERVICE_WORKER_ENTRY_PATH, MODULES_ENTRY_PATH],
    format: "esm",
    external: ["__STATIC_CONTENT_MANIFEST"],
    bundle: true,
    sourcemap: true,
    outdir: tmp,
  });
  const serviceWorkerPath = path.join(tmp, "service-worker.js");
  const modulesPath = path.join(tmp, "modules.js");

  const publicPath = path.join(tmp, "public");
  const publicTestPath = path.join(publicPath, "test.txt");
  await fs.mkdir(publicPath);
  await fs.writeFile(publicTestPath, "hello");

  // Check service-workers supported
  const mf = new Miniflare({
    sitePath: publicPath,
    scriptPath: serviceWorkerPath,
  });
  let res = await mf.dispatchFetch("http://localhost/test.txt");
  t.is(await res.text(), "hello");

  // Check modules supported
  await mf.setOptions({
    sitePath: publicPath,
    modules: true, // https://github.com/cloudflare/miniflare/issues/630
    modulesRoot: tmp,
    scriptPath: modulesPath,
  });
  res = await mf.dispatchFetch("http://localhost/test.txt");
  t.is(await res.text(), "hello");

  // Check edge caching disabled
  await fs.writeFile(publicTestPath, "goodbye");
  res = await mf.dispatchFetch("http://localhost/test.txt");
  t.is(await res.text(), "goodbye");
});
