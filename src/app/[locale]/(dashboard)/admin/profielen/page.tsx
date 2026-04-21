import { ProfilesSection } from '@/components/admin/profiles-section';

export default function AdminProfielenPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profielen (admin)</h1>
        <p className="text-muted-foreground">
          Inspecteer alle opgeslagen LinkedIn-profielen van gebruikers en spot ontbrekende velden.
        </p>
      </div>
      <ProfilesSection />
    </div>
  );
}
