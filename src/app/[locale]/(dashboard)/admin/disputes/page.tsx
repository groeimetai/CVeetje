import { DisputesSection } from '@/components/admin/disputes-section';
import { PageHeader } from '@/components/brand/page-header';

export default function AdminDisputesPage() {
  return (
    <>
      <PageHeader
        eyebrow="§ Derde-lijns review"
        title={<>Dispute <em>inbox</em></>}
        subtitle="Derde-lijns handmatige review van CV-disputes. De eerste twee attempts worden door de AI-gatekeeper afgehandeld; vanaf de derde landen ze hier."
      />
      <DisputesSection />
    </>
  );
}
