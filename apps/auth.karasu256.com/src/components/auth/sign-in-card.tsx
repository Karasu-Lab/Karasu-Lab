'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { authClient } from '@/lib/auth/client';
import { Container, CardContent, CardHeader } from '@Hashibutogarasu/ui';
import { Separator } from '@Hashibutogarasu/ui';
import { Skeleton } from '@Hashibutogarasu/ui';
import { EmailPasswordForm } from './email-password-form';
import { PasskeySection } from './passkey-section';
import { SocialButtons } from './social-buttons';

export interface SignInCardProps {
  continueTo: string;
  forceLogin: boolean;
}

/**
 * Sign-in card that continues to the already-validated `continueTo` URL once
 * a session exists, unless `forceLogin` asks to sign in another account on
 * top of the current one.
 */
export function SignInCard({ continueTo, forceLogin }: SignInCardProps) {
  const t = useTranslations();
  const { data: session, isPending } = authClient.useSession();
  const [email, setEmail] = useState('');
  const ready = !isPending && (forceLogin || !session);

  useEffect(() => {
    if (session && !forceLogin) window.location.replace(continueTo);
  }, [session, forceLogin, continueTo]);

  function handleSignedIn(redirectUrl?: string) {
    window.location.replace(redirectUrl ?? continueTo);
  }

  return (
    <Container className="max-w-sm">
      <CardHeader className="text-lg font-semibold">{t('signIn.title')}</CardHeader>
      <CardContent className="space-y-6">
        <EmailPasswordForm disabled={!ready} onSuccess={handleSignedIn} onEmailChange={setEmail} />
        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">{t('signIn.or')}</span>
          <Separator className="flex-1" />
        </div>
        {ready ? (
          <SocialButtons continueTo={continueTo} />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        )}
        {/* The passkey button stays disabled until an email address is in the form. */}
        <PasskeySection disabled={!ready || !email.trim()} onSuccess={handleSignedIn} />
      </CardContent>
    </Container>
  );
}
