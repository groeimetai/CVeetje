'use client';

import { useTranslations } from 'next-intl';
import { Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/auth-context';

export function ImpersonationBanner() {
  const { impersonating, userData, stopImpersonation } = useAuth();
  const t = useTranslations('admin.impersonation');

  if (!impersonating) return null;

  const handleStop = async () => {
    // stopImpersonation does a full page redirect back to /admin/users
    await stopImpersonation();
  };

  return (
    <div className="sticky top-0 z-50 w-full bg-amber-500 text-amber-950 px-4 py-2">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Eye className="h-4 w-4 flex-shrink-0" />
          <span>
            {t('viewingAs', { name: userData?.displayName || userData?.email || '...' })}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleStop}
          className="bg-amber-600 border-amber-700 text-amber-50 hover:bg-amber-700 hover:text-white"
        >
          <X className="h-3 w-3 mr-1" />
          {t('stopImpersonation')}
        </Button>
      </div>
    </div>
  );
}
