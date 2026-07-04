/**
 * Cloudflare Worker — reliable hourly cron trigger for GitHub Actions.
 *
 * GitHub's own schedule trigger is best-effort and drops runs during high load.
 * This Worker fires every hour via Cloudflare's cron (which is reliable) and
 * dispatches the two data-update workflows via GitHub's workflow_dispatch API.
 *
 * Secrets required (set via `wrangler secret put`):
 *   GITHUB_TOKEN  — fine-grained PAT with Actions: Read & Write on this repo
 */

const REPO = "Mylonas/deals-blog";
const WORKFLOWS = [
  "update-fuel-prices.yml",
  "update-supermarket-prices.yml",
];
const GH_API = "https://api.github.com";

async function dispatchWorkflow(workflow, token) {
  const url = `${GH_API}/repos/${REPO}/actions/workflows/${workflow}/dispatches`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "deals-blog-cron-worker/1.0",
    },
    body: JSON.stringify({ ref: "master" }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`dispatch ${workflow} → HTTP ${res.status}: ${body}`);
  }
  console.log(`Dispatched ${workflow}`);
}

export default {
  async scheduled(_event, env, _ctx) {
    const token = env.GITHUB_TOKEN;
    if (!token) {
      console.error("GITHUB_TOKEN secret is not set");
      return;
    }
    for (const wf of WORKFLOWS) {
      try {
        await dispatchWorkflow(wf, token);
      } catch (err) {
        console.error(err.message);
      }
    }
  },

  // Health-check endpoint — visit the Worker URL to confirm it's live
  async fetch(_req, env, _ctx) {
    const hasToken = Boolean(env.GITHUB_TOKEN);
    return new Response(
      JSON.stringify({ status: "ok", tokenConfigured: hasToken, repo: REPO, workflows: WORKFLOWS }),
      { headers: { "Content-Type": "application/json" } }
    );
  },
};
