"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Plus,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Shield,
  Check,
  Key,
} from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string;
  scope: "read" | "write" | "admin";
  status: "active" | "revoked";
}

const scopeColors: Record<string, string> = {
  read: "bg-blue-500/10 text-blue-400",
  write: "bg-primary/10 text-primary",
  admin: "bg-amber-500/10 text-amber-400",
};

const initialKeys: ApiKey[] = [
  {
    id: "1",
    name: "Production API",
    key: "sk-prod-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    createdAt: "2025-12-01",
    lastUsed: "2026-02-07",
    scope: "admin",
    status: "active",
  },
  {
    id: "2",
    name: "Development",
    key: "sk-dev-q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2",
    createdAt: "2025-11-15",
    lastUsed: "2026-02-06",
    scope: "write",
    status: "active",
  },
  {
    id: "3",
    name: "Read-only Dashboard",
    key: "sk-ro-g3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v8",
    createdAt: "2025-10-20",
    lastUsed: "2026-01-28",
    scope: "read",
    status: "active",
  },
];

export function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScope, setNewKeyScope] = useState<"read" | "write" | "admin">(
    "read"
  );

  const toggleVisibility = (id: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyKey = (id: string, key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const revokeKey = (id: string) => {
    setKeys((prev) =>
      prev.map((k) => (k.id === id ? { ...k, status: "revoked" as const } : k))
    );
  };

  const createKey = () => {
    if (!newKeyName.trim()) return;
    const id = String(Date.now());
    const randomPart = Array.from({ length: 32 }, () =>
      "abcdefghijklmnopqrstuvwxyz0123456789".charAt(
        Math.floor(Math.random() * 36)
      )
    ).join("");
    const newKey: ApiKey = {
      id,
      name: newKeyName,
      key: `sk-${newKeyScope.slice(0, 3)}-${randomPart}`,
      createdAt: new Date().toISOString().split("T")[0],
      lastUsed: "Never",
      scope: newKeyScope,
      status: "active",
    };
    setKeys((prev) => [newKey, ...prev]);
    setNewKeyName("");
    setShowCreateForm(false);
  };

  const maskKey = (key: string) => {
    return key.slice(0, 7) + "..." + key.slice(-4);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Security notice */}
      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <Shield className="mt-0.5 h-5 w-5 text-primary" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Security Best Practices
          </p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            API keys are encrypted with AES-256 at rest. Never share your keys
            publicly. Use scoped keys with the minimum permissions required. Rotate
            keys regularly and revoke unused ones.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">
          Your API Keys
        </h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" />
          Create Key
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-medium text-foreground">
            Create New API Key
          </h3>
          <div className="mt-3 flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Key Name</label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., My Application"
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Scope</label>
              <div className="mt-1 flex gap-2">
                {(["read", "write", "admin"] as const).map((scope) => (
                  <button
                    key={scope}
                    onClick={() => setNewKeyScope(scope)}
                    className={cn(
                      "rounded-md px-3 py-2 text-xs font-medium capitalize transition-colors",
                      newKeyScope === scope
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {scope}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={createKey}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keys list */}
      <div className="flex flex-col gap-3">
        {keys.map((apiKey) => (
          <div
            key={apiKey.id}
            className={cn(
              "rounded-lg border bg-card p-4 transition-colors",
              apiKey.status === "revoked"
                ? "border-destructive/20 opacity-60"
                : "border-border"
            )}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary">
                  <Key className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {apiKey.name}
                    </p>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                        scopeColors[apiKey.scope]
                      )}
                    >
                      {apiKey.scope}
                    </span>
                    {apiKey.status === "revoked" && (
                      <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                        Revoked
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {visibleKeys.has(apiKey.id)
                      ? apiKey.key
                      : maskKey(apiKey.key)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Last used: {apiKey.lastUsed}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleVisibility(apiKey.id)}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    aria-label={
                      visibleKeys.has(apiKey.id) ? "Hide key" : "Show key"
                    }
                  >
                    {visibleKeys.has(apiKey.id) ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => copyKey(apiKey.id, apiKey.key)}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    aria-label="Copy key"
                  >
                    {copiedId === apiKey.id ? (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                  {apiKey.status === "active" && (
                    <button
                      onClick={() => revokeKey(apiKey.id)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Revoke key"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Role-based access info */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">
          Access Scopes
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-md bg-background p-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
                read
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Read-only access to models, features, and documentation. Cannot
              create or modify resources.
            </p>
          </div>
          <div className="rounded-md bg-background p-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                write
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Read and write access. Can create and update resources, manage
              models, and trigger integrations.
            </p>
          </div>
          <div className="rounded-md bg-background p-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
                admin
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Full administrative access including key management, user roles,
              security settings, and billing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
