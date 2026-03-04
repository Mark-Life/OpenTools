import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Globe, Lock, Monitor, Settings } from "lucide-react";

const problems = [
  {
    icon: Settings,
    title: "MCP Servers",
    description: "Require manual setup and configuration. Can't auto-discover.",
  },
  {
    icon: Lock,
    title: "ChatGPT Plugins",
    description:
      "Were platform-locked to a single vendor. And then killed entirely.",
  },
  {
    icon: Globe,
    title: "Plain REST APIs",
    description:
      "No LLM-specific semantics — no approval model, hints, or rate limits.",
  },
  {
    icon: Monitor,
    title: "Browser Automation",
    description:
      "Screen scraping is fragile, slow, and breaks with every UI change.",
  },
] as const;

export function Problem() {
  return (
    <section className="py-16 md:py-24">
      <h2 className="mb-8 text-center font-bold text-2xl md:text-3xl">
        The Problem
      </h2>
      <p className="mx-auto mb-10 max-w-2xl text-center text-muted-foreground">
        Today, connecting LLMs to web apps is either manual, proprietary, or
        fragile. There&apos;s no open, automatic way for an AI to discover what
        a web app can do.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {problems.map((p) => (
          <Card key={p.title}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <p.icon className="size-5 shrink-0 text-muted-foreground" />
                <CardTitle>{p.title}</CardTitle>
              </div>
              <CardDescription>{p.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}
