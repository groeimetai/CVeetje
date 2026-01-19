import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata: Metadata = {
  title: 'Gratis Account Aanmaken',
  description: 'Maak gratis een CVeetje account aan en ontvang 5 credits per maand. Start direct met het maken van professionele CVs met AI.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function RegisterPage() {
  return <RegisterForm />;
}
