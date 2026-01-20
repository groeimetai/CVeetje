'use client';

import { AuthProvider } from '@/components/auth/auth-context';
import { VerifyEmailForm } from '@/components/auth/verify-email-form';

export default function VerifyEmailPage() {
  return (
    <AuthProvider>
      <VerifyEmailForm />
    </AuthProvider>
  );
}
