'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useTranslations } from 'next-intl';
import { toast } from '@Hashibutogarasu/ui';
import { authClient } from '@/lib/auth/client';
import { Button } from '@Hashibutogarasu/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@Hashibutogarasu/ui';
import { Input } from '@Hashibutogarasu/ui';
import { Label } from '@Hashibutogarasu/ui';

/**
 * Requests a password-reset email via better-auth and displays a
 * confirmation message once the server accepts the request.
 */
export function ResetPasswordForm() {
  const t = useTranslations();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // The redirectTo must be absolute: the auth API resolves a relative
    // path against its own origin when it redirects after verifying the
    // token, which lands the user on the API host instead of this page.
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: `${window.location.origin}/reset-password/confirm` });
    if (error) {
      toast.error(error.message ?? t('resetPassword.title'));
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t('resetPassword.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sent ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('resetPassword.sent', { email })}</p>
            <Link href="/" className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <FontAwesomeIcon icon={faArrowLeft} />
              {t('resetPassword.backToSignIn')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">{t('signIn.email')}</Label>
              <Input
                id="reset-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              <FontAwesomeIcon icon={faEnvelope} />
              {loading ? t('resetPassword.sending') : t('resetPassword.sendLink')}
            </Button>
            <Link href="/" className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <FontAwesomeIcon icon={faArrowLeft} />
              {t('resetPassword.backToSignIn')}
            </Link>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
