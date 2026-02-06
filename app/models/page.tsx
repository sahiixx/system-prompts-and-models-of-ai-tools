import { getToolIndex, getByType } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { ModelsCatalogGrid } from "@/components/models-catalog-grid";

export default function ModelsPage() {
  const tools = getToolIndex();
  const byType = getByType();

  const activeTools = tools.tools.filter(
    (t) =>
      t.status === "active" &&
      !["tests", "examples", "api", "yaml", "platform"].includes(t.slug)
  );

  const typeCategories = Object.keys(byType.types);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Models Catalog"
        description="Browse and explore all available AI coding tools and models. Filter by type and access detailed information."
      />
      <div className="p-6 md:p-8">
        <ModelsCatalogGrid tools={activeTools} categories={typeCategories} />
      </div>
    </div>
  );
}
