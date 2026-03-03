import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { ZodSmartCoercionPlugin } from "@orpc/zod";
import { router } from "@/lib/router";

const handler = new OpenAPIHandler(router, {
  plugins: [new ZodSmartCoercionPlugin()],
});

const handleRequest = async (request: Request) => {
  const { response } = await handler.handle(request, { prefix: "/api" });
  return response ?? new Response("Not Found", { status: 404 });
};

export const GET = handleRequest;
export const POST = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
