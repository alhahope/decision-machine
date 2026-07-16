import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the finished PICK ONE machine", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>PICK ONE｜选择困难决策机<\/title>/);
  assert.match(html, /把纠结/);
  assert.match(html, /交给/);
  assert.match(html, /加权轮盘/);
  assert.match(html, /快速抽选/);
  assert.match(html, /淘汰赛/);
  assert.match(html, /启动决策/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("ships weighted picks, preference testing, persistence, and GitHub Pages", async () => {
  const [page, css, layout, config, workflow, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../next.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /function weightedPick/);
  assert.match(page, /function buildTournament/);
  assert.match(page, /getRandomValues/);
  assert.match(page, /pick-one-history/);
  assert.match(page, /有点失望/);
  assert.match(page, /aria-live="polite"/);
  assert.match(css, /transition: transform 4\.2s/);
  assert.match(css, /@media \(max-width:560px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(layout, /PICK ONE｜选择困难决策机/);
  assert.match(config, /output: "export"/);
  assert.match(config, /GITHUB_REPOSITORY/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(packageJson, /"build:pages": "next build"/);
  await access(new URL("../public/.nojekyll", import.meta.url));
});
