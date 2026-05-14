import { PlatformConfigSection } from '@/components/admin/platform-config-section';
import { PageHeader } from '@/components/brand/page-header';

export default function AdminPlatformPage() {
  return (
    <>
      <PageHeader
        eyebrow="§ Model-configuratie"
        title={<>Platform <em>AI</em></>}
        subtitle="Configureer per AI-operatie welk Claude-model wordt gebruikt voor platform-users."
      />
      <PlatformConfigSection />
    </>
  );
}
