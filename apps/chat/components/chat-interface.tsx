"use client";

import { useChat } from "@ai-sdk/react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@workspace/ui/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@workspace/ui/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@workspace/ui/components/ai-elements/prompt-input";
import { Shimmer } from "@workspace/ui/components/ai-elements/shimmer";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@workspace/ui/components/ai-elements/tool";
import { Button } from "@workspace/ui/components/button";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { ToolApproval } from "./tool-approval";

type ToolPart = Extract<UIMessage["parts"][number], { toolCallId: string }>;

/** Type guard for tool invocation parts */
const isToolPart = (part: UIMessage["parts"][number]): part is ToolPart =>
  "toolCallId" in part;

type AddToolOutputFn = (params: {
  tool: string;
  toolCallId: string;
  output: unknown;
}) => void;

const TOOL_PREFIX = /^tool-/;

/** Extracts the tool name from a tool part type string */
const getToolName = (part: ToolPart) => part.type.replace(TOOL_PREFIX, "");

/** Renders a single tool invocation using AI element components */
const ToolInvocationDisplay = ({
  addToolOutput,
  part,
}: {
  addToolOutput: AddToolOutputFn;
  part: ToolPart;
}) => {
  if (part.state === "input-available") {
    return (
      <ToolApproval
        addToolOutput={addToolOutput}
        part={part}
        toolName={getToolName(part)}
      />
    );
  }

  return (
    <Tool>
      <ToolHeader
        state={part.state}
        title={getToolName(part)}
        type={part.type as `tool-${string}`}
      />
      <ToolContent>
        {"input" in part && <ToolInput input={part.input} />}
        {part.state === "output-available" && (
          <ToolOutput errorText={undefined} output={part.output} />
        )}
        {part.state === "output-error" && (
          <ToolOutput errorText={part.errorText} output={part.output} />
        )}
      </ToolContent>
    </Tool>
  );
};

/** Main chat interface component using AI SDK useChat hook */
export function ChatInterface() {
  const {
    addToolOutput,
    error,
    messages,
    regenerate,
    sendMessage,
    status,
    stop,
  } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isLoading = status === "streaming" || status === "submitted";

  return (
    <div className="mx-auto flex h-screen max-w-3xl flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h1 className="font-bold text-lg">Chat</h1>
        <a href="/settings">
          <Button size="sm" variant="outline">
            Settings
          </Button>
        </a>
      </header>

      <Conversation>
        <ConversationContent>
          {messages.map((message) => (
            <Message from={message.role} key={message.id}>
              <MessageContent>
                {message.parts.map((part, i) => {
                  const key = `${message.id}-${i}`;

                  if (part.type === "text") {
                    if (!part.text) {
                      return null;
                    }
                    return (
                      <MessageResponse key={key}>{part.text}</MessageResponse>
                    );
                  }

                  if (isToolPart(part)) {
                    return (
                      <ToolInvocationDisplay
                        addToolOutput={addToolOutput}
                        key={key}
                        part={part}
                      />
                    );
                  }

                  return null;
                })}
              </MessageContent>
            </Message>
          ))}

          {isLoading && messages.at(-1)?.role !== "assistant" && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Thinking...</Shimmer>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {error && (
        <div className="flex items-center gap-2 border-t px-4 py-2 text-destructive text-sm">
          <span>Something went wrong.</span>
          <Button
            onClick={() => regenerate()}
            size="sm"
            type="button"
            variant="outline"
          >
            Retry
          </Button>
        </div>
      )}

      <PromptInput
        className="border-t p-4"
        onSubmit={(message) => {
          if (message.text.trim()) {
            sendMessage({ text: message.text });
          }
        }}
      >
        <PromptInputTextarea placeholder="Type a message..." />
        <PromptInputFooter className="justify-end">
          <PromptInputSubmit onStop={stop} status={status} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
