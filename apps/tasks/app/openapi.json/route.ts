import { withXLlm } from "@opentools/orpc/spec-enhancer";
import { OpenAPIGenerator } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import { router } from "@/lib/router";

const generator = new OpenAPIGenerator({
  schemaConverters: [new ZodToJsonSchemaConverter()],
});

export const GET = async () => {
  const rawSpec = await generator.generate(router, {
    info: { title: "TaskTracker", version: "1.0.0" },
    servers: [{ url: "/api" }],
  });
  const spec = withXLlm(rawSpec, {
    name: "TaskTracker",
    description: "Manage tasks and to-do items",
    defaultApproval: "per-call",
  });
  return Response.json(spec);
};
