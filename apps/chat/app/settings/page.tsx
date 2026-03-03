"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { useCallback, useEffect, useState } from "react";

interface Connection {
  apiKey: string;
  baseUrl: string;
  id: string;
  name: string;
}

export default function SettingsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchConnections = useCallback(async () => {
    const res = await fetch("/api/connections");
    const data = (await res.json()) as Connection[];
    setConnections(data);
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleConnect = async () => {
    if (!(name.trim() && baseUrl.trim())) {
      return;
    }
    setLoading(true);
    await fetch("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, baseUrl, apiKey }),
    });
    setName("");
    setBaseUrl("");
    setApiKey("");
    setLoading(false);
    fetchConnections();
  };

  const handleDisconnect = async (id: string) => {
    await fetch(`/api/connections/${id}`, { method: "DELETE" });
    fetchConnections();
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 font-bold text-2xl">Settings</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Connect an App</CardTitle>
          <CardDescription>
            Add a URL and optional API key to connect an OpenTools-compatible
            app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">App Name</Label>
              <Input
                id="name"
                onChange={(e) => setName(e.target.value)}
                placeholder="My Tasks App"
                value={name}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:3001"
                value={baseUrl}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="apiKey">API Key (optional)</Label>
              <Input
                id="apiKey"
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                type="password"
                value={apiKey}
              />
            </div>
            <Button
              disabled={loading || !name.trim() || !baseUrl.trim()}
              onClick={handleConnect}
            >
              {loading ? "Connecting..." : "Connect"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <h2 className="mb-4 font-semibold text-xl">Connected Apps</h2>

      {connections.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No apps connected yet. Add one above.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {connections.map((conn) => (
            <Card key={conn.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {conn.name}
                  <Button
                    onClick={() => handleDisconnect(conn.id)}
                    size="sm"
                    variant="destructive"
                  >
                    Disconnect
                  </Button>
                </CardTitle>
                <CardDescription>{conn.baseUrl}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
