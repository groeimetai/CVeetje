import { ProfilesSection } from '@/components/admin/profiles-section';
import { PageHeader } from '@/components/brand/page-header';

export default function AdminProfielenPage() {
  return (
    <>
      <PageHeader
        eyebrow="§ User-data"
        title={<>Profielen <em>archief</em></>}
        subtitle="Inspecteer alle opgeslagen LinkedIn-profielen van gebruikers en spot ontbrekende velden."
      />
      <ProfilesSection />
    </>
  );
}
