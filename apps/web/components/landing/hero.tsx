import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { ExternalLink } from "lucide-react";

export function Hero() {
  return (
    <section className="py-16 md:py-24">
      <div className="flex flex-col items-center gap-6 text-center">
        <Badge variant="outline">Early-Stage Proposal</Badge>
        <h1 className="font-bold text-4xl tracking-tight md:text-6xl">
          OpenTools
        </h1>
        <p className="max-w-2xl text-muted-foreground text-xl md:text-2xl">
          A web standard for LLMs to discover and interact with any web app — no
          plugins, no setup, just a URL.
        </p>
        <p className="max-w-xl text-muted-foreground">
          User gives a URL to their LLM client. Client discovers available
          actions. LLM interacts with the app on behalf of the user.
        </p>
        <div className="flex gap-3">
          <Button asChild size="lg">
            <a href="#spec">Read the Spec</a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a
              href="https://github.com/Mark-Life/OpenTools"
              rel="noopener noreferrer"
              target="_blank"
            >
              <ExternalLink data-icon="inline-start" />
              View on GitHub
            </a>
          </Button>
        </div>
        <Card className="mt-4 w-full max-w-lg text-left">
          <CardContent>
            <pre className="whitespace-pre-wrap font-mono text-muted-foreground text-sm">
              {`User: "Create a task called 'Buy groceries' due tomorrow"

> Chat app already connected to task tracker via URL
> LLM sees auto-discovered tools from the app's OpenAPI spec
> LLM calls createTask tool
> User approves (per-call policy) → task created`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
