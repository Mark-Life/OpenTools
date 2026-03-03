import { WELL_KNOWN_PATH } from "@opentools/spec/constants";
import type { LlmDiscovery } from "@opentools/spec/types";

/** Fetches the LLM discovery document from a base URL */
export const discoverLlm = async (baseUrl: string): Promise<LlmDiscovery> => {
  const url = new URL(WELL_KNOWN_PATH, baseUrl);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch LLM discovery from ${url}: ${response.status} ${response.statusText}`
    );
  }
  return (await response.json()) as LlmDiscovery;
};
