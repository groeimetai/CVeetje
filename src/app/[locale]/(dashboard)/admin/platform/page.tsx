import { PlatformConfigSection } from '@/components/admin/platform-config-section';

export default function AdminPlatformPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Platform AI</h1>
        <p className="text-muted-foreground">
          Configureer per AI-operatie welk Claude-model wordt gebruikt voor platform-users.
        </p>
      </div>
      <PlatformConfigSection />
    </div>
  );
}
