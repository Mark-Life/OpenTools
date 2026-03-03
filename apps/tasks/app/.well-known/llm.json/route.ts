import { createDiscoveryResponse } from "@opentools/orpc/discovery";

export const GET = () =>
  createDiscoveryResponse({ openapiPath: "/openapi.json", auth: "api-key" });
