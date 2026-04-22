import { DisputesSection } from '@/components/admin/disputes-section';

export default function AdminDisputesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Disputes (admin)</h1>
        <p className="text-muted-foreground">
          Derde-lijns handmatige review van CV-disputes. De eerste twee attempts
          worden door de AI-gatekeeper afgehandeld; vanaf de derde landen ze hier.
        </p>
      </div>
      <DisputesSection />
    </div>
  );
}
