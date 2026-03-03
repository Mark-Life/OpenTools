import { google } from "@ai-sdk/google";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { listConnections } from "@/lib/connections";
import { loadAllTools } from "@/lib/tools";

export const maxDuration = 30;

export const POST = async (req: Request) => {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const connections = listConnections();
  const { tools } = await loadAllTools(connections);

  const modelMessages = await convertToModelMessages(messages);
  console.log("[chat] model messages:", modelMessages.length);

  const result = streamText({
    model: google("gemini-2.5-flash"),
    system:
      "You are a helpful assistant with access to external tools from connected applications. Use the tools when appropriate to help the user.",
    messages: modelMessages,
    tools: tools as Parameters<typeof streamText>[0]["tools"],
    stopWhen: stepCountIs(10),
    onFinish: ({ text, finishReason, usage }) => {
      console.log("[chat] finish:", {
        finishReason,
        usage,
        textLength: text.length,
      });
    },
    onError: ({ error }) => {
      console.error("[chat] stream error:", error);
    },
  });

  return result.toUIMessageStreamResponse();
};
