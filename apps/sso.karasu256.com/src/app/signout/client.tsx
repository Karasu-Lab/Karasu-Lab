'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { LoadingView } from '@Hashibutogarasu/ui';
import { authClient } from '@/lib/auth/client';

export interface SignOutClientProps {
  next: string;
}

/** Clears the better-auth session, then navigates to the already-validated `next` URL. */
export function SignOutClient({ next }: SignOutClientProps) {
  const t = useTranslations();

  useEffect(() => {
    async function performSignOut() {
      try {
        await authClient.signOut();
      } finally {
        window.location.replace(next);
      }
    }
    performSignOut();
  }, [next]);

  return <LoadingView message={t('settings.signingOut')} />;
}
