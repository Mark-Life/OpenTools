import type { LlmDiscovery } from "@opentools/spec/types";

interface DiscoveryOptions {
  auth: string;
  openapiPath: string;
}

/** Creates a Response serving the LLM discovery JSON document */
export const createDiscoveryResponse = (opts: DiscoveryOptions): Response => {
  const body: LlmDiscovery = {
    auth: opts.auth,
    openapi: opts.openapiPath,
  };

  return Response.json(body);
};
