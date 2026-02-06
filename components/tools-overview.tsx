import Link from "next/link";
import type { Tool } from "@/lib/data";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

const typeColors: Record<string, string> = {
  "IDE Plugin": "bg-primary/10 text-primary",
  "Web Platform": "bg-blue-500/10 text-blue-400",
  "Autonomous Agent": "bg-amber-500/10 text-amber-400",
};

export function ToolsOverview({ tools }: { tools: Tool[] }) {
  const activeTools = tools.filter(
    (t) =>
      t.status === "active" &&
      !["tests", "examples", "api", "yaml", "platform"].includes(t.slug)
  );

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Active Tools
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeTools.length} AI coding assistants available
          </p>
        </div>
        <Link
          href="/models"
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          View all
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {activeTools.slice(0, 9).map((tool) => (
          <Link
            key={tool.slug}
            href={`/models/${tool.slug}`}
            className="flex items-center justify-between rounded-md border border-border bg-background p-3 transition-colors hover:border-primary/50 hover:bg-secondary"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-sm font-semibold text-foreground">
                {tool.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {tool.name}
                </p>
                <span
                  className={cn(
                    "mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
                    typeColors[tool.type] || "bg-secondary text-muted-foreground"
                  )}
                >
                  {tool.type}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
