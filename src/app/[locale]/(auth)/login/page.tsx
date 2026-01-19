import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: 'Inloggen',
  description: 'Log in op je CVeetje account om je professionele CVs te beheren en nieuwe te maken met AI.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function LoginPage() {
  return <LoginForm />;
}
