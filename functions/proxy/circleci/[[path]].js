export async function onRequest({ request }) {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  const apiPath = url.pathname.replace(/^\/proxy\/circleci/, "");
  const targetUrl = `https://circleci.com/api/v2${apiPath}${url.search}`;

  const response = await fetch(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.method !== "GET" ? request.body : undefined,
  });

  const newHeaders = new Headers(response.headers);
  newHeaders.set("Access-Control-Allow-Origin", "*");

  return new Response(response.body, {
    status: response.status,
    headers: newHeaders,
  });
}
