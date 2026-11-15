// Cloudflare Pages Function, runs for every page request (see public/_routes.json).
//
// 1) The site now lives at https://mouxti.com. Any request that arrives on a
//    *.pages.dev hostname (the old deals-blog.pages.dev address and its preview
//    deployments) is permanently redirected to the same path and query on
//    mouxti.com. Bulk Redirects cannot do this because pages.dev is not a zone
//    in our account.
// 2) Hidden posts: these slugs are not built any more (see `hidden: true` in
//    posts/*/<slug>.md and the _<slug> route folders). Pages can keep serving a
//    previously cached copy of an old deployment's asset for the exact URL, so
//    answer 404 here, before the asset lookup. To un-hide a post, remove its slug
//    from HIDDEN_SLUGS as well.
const HIDDEN_SLUGS = [
  "cheapest-cars-cyprus",
  "student-deals-cyprus",
  "cheapest-internet-broadband-cyprus",
  "cheapest-supermarket-products",
  "cheapest-gym-memberships-nicosia-limassol",
  "cheapest-fried-chicken-nicosia",
  "cheapest-electricity-plans-cyprus",
  "cheapest-cinema-tickets-cyprus",
  "best-value-meze-restaurants-cyprus",
  "supermarket-price-watch",
];

export function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.hostname.endsWith(".pages.dev")) {
    return Response.redirect("https://mouxti.com" + url.pathname + url.search, 301);
  }
  const m = url.pathname.match(/^\/(?:el\/|ru\/)?posts\/([^/]+)\/?$/);
  if (m && HIDDEN_SLUGS.includes(m[1])) {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex" },
    });
  }
  if (/^\/(?:el\/|ru\/)?jobs\/?$/.test(url.pathname)) {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex" },
    });
  }
  return context.next();
}
