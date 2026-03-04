import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
  MessageSquare,
  Shield,
} from "lucide-react";

const fields = [
  {
    icon: CheckCircle,
    name: "enabled",
    description: "Whether this operation is exposed to LLMs",
  },
  {
    icon: Shield,
    name: "approval",
    description:
      '"auto" or "per-call" — minimum approval level the app requires',
  },
  {
    icon: AlertTriangle,
    name: "destructive",
    description: "UI hint to show a warning before executing",
  },
  {
    icon: MessageSquare,
    name: "hint",
    description: "Natural language guidance for when/why to use this action",
  },
  {
    icon: CreditCard,
    name: "costIndicator",
    description:
      '"free", "credits", or "paid" — tells the LLM if this costs the user money',
  },
  {
    icon: Clock,
    name: "rateLimit",
    description: "Per-user throttle so the LLM can self-limit API calls",
  },
] as const;

export function Spec() {
  return (
    <section className="py-16 md:py-24" id="spec">
      <h2 className="mb-3 text-center font-bold text-2xl md:text-3xl">
        The x-llm Extension
      </h2>
      <p className="mx-auto mb-8 max-w-2xl text-center text-muted-foreground">
        OpenAPI extensions that give LLMs the context they need. Builds on top
        of OpenAPI — no separate spec to learn.
      </p>
      <div className="mb-8 space-y-4">
        <div>
          <p className="mb-2 font-medium text-sm">Root Level</p>
          <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm">
            {`x-llm:
  version: "0.1"
  name: "RecipeApp"
  description: "Save, organize, and discover recipes"
  defaultApproval: "per-call"`}
          </pre>
        </div>
        <div>
          <p className="mb-2 font-medium text-sm">Operation Level</p>
          <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm">
            {`x-llm:
  enabled: true                    # expose this to LLMs
  approval: "auto" | "per-call"   # minimum approval level
  blanketApprovalAllowed: boolean  # can user opt into "always allow"
  destructive: boolean             # UI hint: show warning
  rateLimit: { max, window }      # per-user throttle for LLM calls
  hint: string                     # when to use this (richer than summary)
  costIndicator: "free" | "credits" | "paid"`}
          </pre>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {fields.map((f) => (
          <Card key={f.name} size="sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <f.icon className="size-4 shrink-0 text-muted-foreground" />
                <CardTitle className="font-mono">{f.name}</CardTitle>
              </div>
              <CardDescription>{f.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}
