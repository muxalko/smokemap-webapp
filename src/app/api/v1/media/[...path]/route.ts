import { mediaBackendPath, proxyBackendRequest } from "@/lib/backend-proxy";

type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const backendPath = mediaBackendPath(
    path,
    new URL(request.url).pathname.endsWith("/")
  );
  if (!backendPath) return new Response("Not found", { status: 404 });
  return proxyBackendRequest(request, backendPath);
}

export {
  handle as DELETE,
  handle as GET,
  handle as HEAD,
  handle as OPTIONS,
  handle as PATCH,
  handle as POST,
  handle as PUT,
};
