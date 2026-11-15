// Cloudflare Pages Function: the site now lives at https://mouxti.com.
// Any request that arrives on a *.pages.dev hostname (the old
// deals-blog.pages.dev address and its preview deployments) is permanently
// redirected to the same path and query on mouxti.com. Bulk Redirects cannot
// do this because pages.dev is not a zone in our account.
export function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.hostname.endsWith(".pages.dev")) {
    return Response.redirect("https://mouxti.com" + url.pathname + url.search, 301);
  }
  return context.next();
}
