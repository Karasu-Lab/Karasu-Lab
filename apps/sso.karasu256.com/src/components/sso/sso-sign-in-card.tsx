'use client';

import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuilding, faRightToBracket } from '@fortawesome/free-solid-svg-icons';
import { useTranslations } from 'next-intl';
import { Button, buttonVariants, Container, CardContent, CardHeader, Input, Label, Separator, toast } from '@Hashibutogarasu/ui';
import { authClient } from '@/lib/auth/client';

export interface SsoSignInCardProps {
  continueTo: string;
  forceLogin: boolean;
  /** Error code the SSO flow came back with (e.g. an IdP-initiated failure), if any. */
  errorCode?: string;
}

const KNOWN_ERROR_CODES = ['provider_not_found', 'invalid_saml_response', 'replay_detected', 'unsolicited_response'] as const;

/**
 * SSO-only counterpart of auth.karasu256.com's sign-in card: same shell,
 * session handling and `continueTo` contract, but the only credential it
 * asks for is a work email address. better-auth's SSO plugin resolves the
 * identity provider registered for the address's domain and redirects
 * there; the password is entered on the provider, never here.
 */
export function SsoSignInCard({ continueTo, forceLogin, errorCode }: SsoSignInCardProps) {
  const t = useTranslations();
  const { data: session, isPending } = authClient.useSession();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const ready = !isPending && (forceLogin || !session);

  useEffect(() => {
    if (session && !forceLogin) window.location.replace(continueTo);
  }, [session, forceLogin, continueTo]);

  useEffect(() => {
    if (!errorCode) return;
    const known = (KNOWN_ERROR_CODES as readonly string[]).includes(errorCode);
    toast.error(t(known ? `sso.error.${errorCode}` : 'sso.error.unknown'));
  }, [errorCode, t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await authClient.signIn.sso({ email, callbackURL: continueTo });
    if (error) {
      const code = error.code ?? (error.status === 404 ? 'provider_not_found' : '');
      const known = (KNOWN_ERROR_CODES as readonly string[]).includes(code);
      toast.error(t(known ? `sso.error.${code}` : 'sso.error.unknown'));
      setLoading(false);
      return;
    }
    const url = (data as { url?: string } | null)?.url;
    if (url) window.location.replace(url);
  }

  const authSignInUrl = `${process.env.NEXT_PUBLIC_AUTH_URL ?? ''}/sign-in?redirectTo=${encodeURIComponent(continueTo)}`;

  return (
    <Container className="max-w-sm">
      <CardHeader className="text-lg font-semibold">{t('sso.title')}</CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">{t('sso.description')}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sso-email">{t('sso.email')}</Label>
            <Input
              id="sso-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              required
              disabled={!ready || loading}
            />
            <p className="text-xs text-muted-foreground">{t('sso.emailHint')}</p>
          </div>
          <Button type="submit" className="w-full" disabled={!ready || loading || !email}>
            <FontAwesomeIcon icon={faBuilding} />
            {loading ? t('sso.signingIn') : t('sso.submit')}
          </Button>
        </form>
        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">{t('sso.or')}</span>
          <Separator className="flex-1" />
        </div>
        <a href={authSignInUrl} className={buttonVariants({ variant: 'outline', className: 'w-full' })}>
          <FontAwesomeIcon icon={faRightToBracket} />
          {t('sso.usePassword')}
        </a>
      </CardContent>
    </Container>
  );
}
