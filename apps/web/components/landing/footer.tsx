"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import { ExternalLink } from "lucide-react";

const openQuestions = [
  {
    q: "Discovery endpoint",
    a: "Should discovery be /.well-known/llm.json pointing to OpenAPI, or just convention that /.well-known/openapi.json with x-llm root field is enough?",
  },
  {
    q: "Stateful flows",
    a: "How to handle multi-step wizards and transactions that require maintaining state across API calls?",
  },
  {
    q: "Versioning",
    a: "How does the client handle spec version changes? Should specs be cached, and for how long?",
  },
  {
    q: "Security",
    a: "How to prevent a malicious manifest from social-engineering the LLM into harmful actions through misleading descriptions?",
  },
  {
    q: "Extension naming",
    a: "x-llm vs x-opentools vs x-agent — what should the extension prefix be?",
  },
  {
    q: "Streaming",
    a: "How to handle streaming responses from endpoints?",
  },
  {
    q: "Registry",
    a: "Should there be a registry of OpenTools-compatible apps, or is auto-discovery enough?",
  },
] as const;

export function Footer() {
  return (
    <section className="py-16 md:py-24">
      <div className="mb-10 flex flex-col items-center gap-6">
        <Badge variant="secondary">Work in Progress</Badge>
        <div className="space-y-1 text-center text-muted-foreground text-sm">
          <p>Core packages (spec, orpc, ai-sdk) have initial implementations</p>
          <p>Demo apps are partially built</p>
          <p>Not yet published, production-tested, or spec-finalized</p>
        </div>
      </div>
      <Separator className="mb-10" />
      <h3 className="mb-4 font-bold text-xl">Open Questions</h3>
      <Accordion type="multiple">
        {openQuestions.map((q, i) => (
          <AccordionItem key={q.q} value={`q-${String(i)}`}>
            <AccordionTrigger>{q.q}</AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground">{q.a}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <Separator className="my-10" />
      <div className="flex justify-center">
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
    </section>
  );
}
