import { PageHeader } from "@/components/page-header";
import { ApiKeyManager } from "@/components/api-key-manager";

export default function KeysPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="API Keys"
        description="Securely manage your API keys. Keys are encrypted at rest and masked in the UI for your security."
      />
      <div className="p-6 md:p-8">
        <ApiKeyManager />
      </div>
    </div>
  );
}
