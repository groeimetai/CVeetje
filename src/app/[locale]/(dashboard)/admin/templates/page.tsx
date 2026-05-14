'use client';

import { GlobalTemplatesSection } from '@/components/admin/global-templates-section';
import { PageHeader } from '@/components/brand/page-header';

export default function AdminTemplatesPage() {
  return (
    <>
      <PageHeader
        eyebrow="§ Globale DOCX-templates"
        title={<>Templates <em>beheer</em></>}
        subtitle="Beheer de templates die alle gebruikers kunnen kiezen tijdens de wizard."
      />
      <GlobalTemplatesSection />
    </>
  );
}
