'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/users');
  }, [router]);

  return null;
}
