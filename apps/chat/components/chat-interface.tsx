"use client";

import { useChat } from "@ai-sdk/react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import type { UIMessage } from "ai";
import { ToolApproval } from "./tool-approval";

/** Renders a single tool invocation (call or result) inline */
const ToolInvocationDisplay = ({
  addToolResult,
  part,
}: {
  addToolResult: (params: { toolCallId: string; result: unknown }) => void;
  part: UIMessage["parts"][number] & { type: "tool-invocation" };
}) => {
  const { toolInvocation } = part;

  if (toolInvocation.state === "call") {
    return (
      <ToolApproval
        addToolResult={addToolResult}
        toolInvocation={toolInvocation}
      />
    );
  }

  if (toolInvocation.state === "partial-call") {
    return (
      <div className="my-1 flex items-center gap-2 text-muted-foreground text-sm">
        <Badge variant="secondary">Calling</Badge>
        <span className="font-mono">{toolInvocation.toolName}</span>
      </div>
    );
  }

  return (
    <Card className="my-2 max-w-md bg-muted/50 p-3">
      <div className="mb-1 flex items-center gap-2">
        <Badge variant="secondary">Result</Badge>
        <span className="font-mono text-sm">{toolInvocation.toolName}</span>
      </div>
      <pre className="overflow-x-auto rounded bg-background p-2 text-xs">
        {JSON.stringify(toolInvocation.result, null, 2)}
      </pre>
    </Card>
  );
};

/** Renders a single message with text and tool invocation parts */
const MessageBubble = ({
  addToolResult,
  message,
}: {
  addToolResult: (params: { toolCallId: string; result: unknown }) => void;
  message: UIMessage;
}) => {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {message.parts.map((part, i) => {
          const key = `${message.id}-${i}`;

          if (part.type === "text") {
            if (!part.text) {
              return null;
            }
            return (
              <p className="whitespace-pre-wrap" key={key}>
                {part.text}
              </p>
            );
          }

          if (part.type === "tool-invocation") {
            return (
              <ToolInvocationDisplay
                addToolResult={addToolResult}
                key={key}
                part={part}
              />
            );
          }

          return null;
        })}
      </div>
    </div>
  );
};

/** Main chat interface component using AI SDK useChat hook */
export function ChatInterface() {
  const {
    addToolResult,
    handleInputChange,
    handleSubmit,
    input,
    messages,
    status,
  } = useChat({
    api: "/api/chat",
    maxSteps: 10,
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

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <MessageBubble
              addToolResult={addToolResult}
              key={message.id}
              message={message}
            />
          ))}

          {isLoading && messages.at(-1)?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-muted px-4 py-2 text-muted-foreground">
                Thinking...
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <form className="flex gap-2 border-t p-4" onSubmit={handleSubmit}>
        <Input
          onChange={handleInputChange}
          placeholder="Type a message..."
          value={input}
        />
        <Button disabled={isLoading || !input.trim()} type="submit">
          Send
        </Button>
      </form>
    </div>
  );
}
