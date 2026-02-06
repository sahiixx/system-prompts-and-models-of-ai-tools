import { getToolIndex, getToolDetail, getToolMetadata } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { ToolDetailView } from "@/components/tool-detail-view";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  const tools = getToolIndex();
  return tools.tools.map((tool) => ({ slug: tool.slug }));
}

export default async function ToolDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tools = getToolIndex();
  const tool = tools.tools.find((t) => t.slug === slug);

  if (!tool) {
    notFound();
  }

  const detail = getToolDetail(slug);
  const metadata = getToolMetadata(slug);

  return (
    <div className="flex flex-col">
      <PageHeader title={tool.name} description={tool.description}>
        <Link
          href="/models"
          className="flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Catalog
        </Link>
      </PageHeader>
      <div className="p-6 md:p-8">
        <ToolDetailView tool={tool} detail={detail} metadata={metadata} />
      </div>
    </div>
  );
}
