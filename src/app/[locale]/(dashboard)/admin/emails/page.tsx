'use client';

import { EmailsSection } from '@/components/admin/emails-section';
import { PageHeader } from '@/components/brand/page-header';

export default function AdminEmailsPage() {
  return (
    <>
      <PageHeader
        eyebrow="§ Outbound log"
        title={<>Email <em>verkeer</em></>}
        subtitle="Alle outbound transactionele mails — welkom, credits-low, reset, betalingsbevestigingen."
      />
      <EmailsSection />
    </>
  );
}
