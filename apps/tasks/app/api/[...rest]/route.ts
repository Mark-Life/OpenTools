import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { ZodSmartCoercionPlugin } from "@orpc/zod";
import { router } from "@/lib/router";

const handler = new OpenAPIHandler(router, {
  plugins: [new ZodSmartCoercionPlugin()],
});

const handleRequest = (request: Request) => handler.handle(request);

export const GET = handleRequest;
export const POST = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
