import { Badge } from "@workspace/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

type Status = "yes" | "no" | "partial";

const statusBadge = (status: Status) => {
  const variants: Record<
    Status,
    { variant: "default" | "secondary" | "outline"; label: string }
  > = {
    yes: { variant: "default", label: "Yes" },
    no: { variant: "outline", label: "No" },
    partial: { variant: "secondary", label: "Partial" },
  };
  const { variant, label } = variants[status];
  return <Badge variant={variant}>{label}</Badge>;
};

const approaches = [
  {
    name: "OpenTools",
    discovery: "yes" as Status,
    auth: "yes" as Status,
    approval: "yes" as Status,
    llmNative: "yes" as Status,
    open: "yes" as Status,
  },
  {
    name: "MCP",
    discovery: "no" as Status,
    auth: "partial" as Status,
    approval: "partial" as Status,
    llmNative: "yes" as Status,
    open: "yes" as Status,
  },
  {
    name: "ChatGPT Plugins",
    discovery: "no" as Status,
    auth: "yes" as Status,
    approval: "partial" as Status,
    llmNative: "partial" as Status,
    open: "no" as Status,
  },
  {
    name: "Plain REST",
    discovery: "no" as Status,
    auth: "partial" as Status,
    approval: "no" as Status,
    llmNative: "no" as Status,
    open: "yes" as Status,
  },
] as const;

const columns = [
  "Discovery",
  "Auth",
  "Approval",
  "LLM-native",
  "Open",
] as const;

export function Comparison() {
  return (
    <section className="py-16 md:py-24">
      <h2 className="mb-3 text-center font-bold text-2xl md:text-3xl">
        Comparison
      </h2>
      <p className="mx-auto mb-8 max-w-2xl text-center text-muted-foreground">
        How OpenTools compares to existing approaches for connecting LLMs to web
        apps.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Approach</TableHead>
            {columns.map((col) => (
              <TableHead className="text-center" key={col}>
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {approaches.map((a) => (
            <TableRow key={a.name}>
              <TableCell className="font-medium">{a.name}</TableCell>
              <TableCell className="text-center">
                {statusBadge(a.discovery)}
              </TableCell>
              <TableCell className="text-center">
                {statusBadge(a.auth)}
              </TableCell>
              <TableCell className="text-center">
                {statusBadge(a.approval)}
              </TableCell>
              <TableCell className="text-center">
                {statusBadge(a.llmNative)}
              </TableCell>
              <TableCell className="text-center">
                {statusBadge(a.open)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
