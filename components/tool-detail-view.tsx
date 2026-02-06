import type { Tool } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Shield, Box, Code, Cpu, Zap } from "lucide-react";

const typeColors: Record<string, string> = {
  "IDE Plugin": "bg-primary/10 text-primary",
  "Web Platform": "bg-blue-500/10 text-blue-400",
  "Autonomous Agent": "bg-amber-500/10 text-amber-400",
};

interface ToolDetailViewProps {
  tool: Tool;
  detail: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
}

export function ToolDetailView({ tool, detail, metadata }: ToolDetailViewProps) {
  const meta = metadata as Record<string, unknown> | null;
  const features = (meta?.features as string[]) || [];
  const pricing = (meta?.pricing as string) || "Unknown";

  return (
    <div className="flex flex-col gap-6">
      {/* Overview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5 lg:col-span-2">
          <h2 className="text-base font-semibold text-foreground">Overview</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {tool.description}
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                typeColors[tool.type] || "bg-secondary text-muted-foreground"
              )}
            >
              <Box className="h-3 w-3" />
              {tool.type}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
              <Shield className="h-3 w-3" />
              {pricing}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
              <Zap className="h-3 w-3" />
              {tool.status}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">
            Quick Info
          </h2>
          <dl className="mt-3 flex flex-col gap-3">
            <div>
              <dt className="text-xs text-muted-foreground">Slug</dt>
              <dd className="mt-0.5 font-mono text-sm text-foreground">
                {tool.slug}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Type</dt>
              <dd className="mt-0.5 text-sm text-foreground">{tool.type}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Status</dt>
              <dd className="mt-0.5 flex items-center gap-2 text-sm text-foreground">
                <span className="h-2 w-2 rounded-full bg-primary" />
                {tool.status}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Features */}
      {features.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">
            Supported Features
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {features.map((feature) => (
              <span
                key={feature}
                className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-foreground"
              >
                <Code className="h-3 w-3 text-primary" />
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Raw detail data */}
      {detail && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">
            Tool Configuration
          </h2>
          <div className="mt-3 overflow-auto rounded-md bg-background p-4">
            <pre className="font-mono text-xs text-muted-foreground leading-relaxed">
              {JSON.stringify(detail, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
