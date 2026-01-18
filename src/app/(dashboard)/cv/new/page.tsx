import { CVWizard } from '@/components/cv/cv-wizard';

export const metadata = {
  title: 'Create New CV - CVeetje',
  description: 'Create a new professional CV with AI',
};

export default function NewCVPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create New CV</h1>
        <p className="text-muted-foreground">
          Follow the steps below to generate your professional CV
        </p>
      </div>

      <CVWizard />
    </div>
  );
}
