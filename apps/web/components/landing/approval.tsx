import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

const layers = [
  {
    level: "Site policy",
    who: "App developer",
    how: "Sets approval + blanketApprovalAllowed per operation",
    example: '"Delete always requires confirmation"',
  },
  {
    level: "User preference",
    who: "End user",
    how: "Can escalate approval (never downgrade)",
    example: '"I want to approve all writes"',
  },
  {
    level: "LLM client",
    who: "Chat app / agent",
    how: "Enforces both layers above",
    example: "Shows confirmation UI before calling",
  },
] as const;

export function Approval() {
  return (
    <section className="py-16 md:py-24">
      <h2 className="mb-3 text-center font-bold text-2xl md:text-3xl">
        Approval Model
      </h2>
      <p className="mx-auto mb-8 max-w-2xl text-center text-muted-foreground">
        Three layers of consent. The app sets the minimum. The user can only
        make it stricter, never looser.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Layer</TableHead>
            <TableHead>Who Decides</TableHead>
            <TableHead className="hidden md:table-cell">How</TableHead>
            <TableHead>Example</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {layers.map((l) => (
            <TableRow key={l.level}>
              <TableCell className="font-medium">{l.level}</TableCell>
              <TableCell>{l.who}</TableCell>
              <TableCell className="hidden md:table-cell">{l.how}</TableCell>
              <TableCell className="text-muted-foreground">
                {l.example}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Example: User Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 font-mono text-sm">
            {`User: "Find me a good pasta recipe and save it"

LLM thinks:
1. I see recipes.app is connected
2. Read manifest → search_recipes (auto-approve) + save_favorite (per-call)
3. Call search_recipes → get results
4. Present results to user
5. User picks one → LLM requests save_favorite
6. Client shows: "RecipeApp wants to save 'Cacio e Pepe'
   to favorites. Allow? [Yes] [Always allow]"
7. User approves → call executes`}
          </pre>
        </CardContent>
      </Card>
    </section>
  );
}
