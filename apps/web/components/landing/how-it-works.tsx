import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

const steps = [
  {
    step: "1",
    title: "Discovery",
    description:
      "Client fetches /.well-known/llm.json from the app's domain. Gets a pointer to the OpenAPI spec.",
  },
  {
    step: "2",
    title: "Read Spec",
    description:
      "Parses the OpenAPI spec and finds operations with x-llm extensions — approval policies, hints, rate limits.",
  },
  {
    step: "3",
    title: "Generate Tools",
    description:
      "Dynamically converts each x-llm-enabled operation into an AI SDK tool. No hardcoded integrations.",
  },
] as const;

export function HowItWorks() {
  return (
    <section className="py-16 md:py-24">
      <h2 className="mb-8 text-center font-bold text-2xl md:text-3xl">
        How It Works
      </h2>
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {steps.map((s) => (
          <Card key={s.step}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-sm">
                  {s.step}
                </span>
                <CardTitle>{s.title}</CardTitle>
              </div>
              <CardDescription>{s.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Pipeline: Zod to OpenAPI to LLM Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm">
            {`Zod schema + .describe()
        |
        v
   oRPC / Hono / FastAPI / NestJS
        |
        v
   OpenAPI spec (with x-llm extensions)
        |
        v
   /.well-known/openapi.json
        |
        v
   LLM client reads spec
        |
        v
   Dynamically generates AI SDK tools`}
          </pre>
        </CardContent>
      </Card>
    </section>
  );
}
