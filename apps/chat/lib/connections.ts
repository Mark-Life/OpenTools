export interface Connection {
  apiKey: string;
  baseUrl: string;
  id: string;
  name: string;
}

const connections = new Map<string, Connection>();

/** Generate a simple unique ID */
const generateId = () => crypto.randomUUID();

/** List all connections */
export const listConnections = () => [...connections.values()];

/** Get a connection by ID */
export const getConnection = (id: string) => connections.get(id);

/** Create a new connection and return it */
export const createConnection = (input: Omit<Connection, "id">): Connection => {
  const id = generateId();
  const connection: Connection = { ...input, id };
  connections.set(id, connection);
  return connection;
};

/** Update an existing connection */
export const updateConnection = (
  id: string,
  input: Partial<Omit<Connection, "id">>
): Connection | undefined => {
  const existing = connections.get(id);
  if (!existing) {
    return undefined;
  }
  const updated: Connection = { ...existing, ...input };
  connections.set(id, updated);
  return updated;
};

/** Delete a connection by ID */
export const deleteConnection = (id: string): boolean => connections.delete(id);
