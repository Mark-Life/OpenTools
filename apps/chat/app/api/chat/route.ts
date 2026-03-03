import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { listConnections } from "@/lib/connections";
import { loadAllTools } from "@/lib/tools";

export const POST = async (req: Request) => {
  const { messages } = (await req.json()) as { messages: unknown };

  const connections = listConnections();
  const { tools } = await loadAllTools(connections);

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system:
      "You are a helpful assistant with access to external tools from connected applications. Use the tools when appropriate to help the user.",
    messages: messages as Parameters<typeof streamText>[0]["messages"],
    tools: tools as Parameters<typeof streamText>[0]["tools"],
    maxSteps: 10,
  });

  return result.toDataStreamResponse();
};
