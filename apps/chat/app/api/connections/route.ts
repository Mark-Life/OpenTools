import { createConnection, listConnections } from "@/lib/connections";

export const GET = () => Response.json(listConnections());

export const POST = async (req: Request) => {
  const body = (await req.json()) as {
    apiKey: string;
    baseUrl: string;
    name: string;
  };
  const connection = createConnection({
    apiKey: body.apiKey,
    baseUrl: body.baseUrl,
    name: body.name,
  });
  return Response.json(connection, { status: 201 });
};
