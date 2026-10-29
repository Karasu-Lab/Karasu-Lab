'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle, faGithub } from '@fortawesome/free-brands-svg-icons';
import { faFingerprint } from '@fortawesome/free-solid-svg-icons';
import { useTranslations } from 'next-intl';
import { Spinner, toast } from '@Hashibutogarasu/ui';
import { authClient } from '@/lib/auth/client';

type Provider = 'google' | 'github' | 'passkey';

export interface ProviderButtonsProps {
  continueTo: string;
  /** Called after a passkey sign-in, with the URL better-auth asked to continue to, if any. */
  onSignedIn: (redirectUrl?: string) => void;
  /** Disables all three buttons, e.g. while the email step is working. */
  disabled?: boolean;
}

/**
 * The provider sign-in buttons as a row of round icon buttons: Google,
 * GitHub, and passkey. They are plain press targets — standard hover and
 * pressed feedback, no sliding animation — and sit side by side under the
 * email step. Social sign-in delegates the OAuth handshake to better-auth,
 * which lands on `/auth/callback` to confirm the session before
 * continuing; the passkey button runs a discoverable-credential ceremony.
 */
export function ProviderButtons({ continueTo, onSignedIn, disabled = false }: ProviderButtonsProps) {
  const t = useTranslations();
  const [loading, setLoading] = useState<Provider | null>(null);

  async function handleSocial(provider: 'google' | 'github') {
    setLoading(provider);
    const { error } = await authClient.signIn.social({
      provider,
      callbackURL: `/auth/callback?redirectTo=${encodeURIComponent(continueTo)}`,
      errorCallbackURL: '/oauth/error',
    });
    if (error) setLoading(null);
  }

  async function handlePasskey() {
    setLoading('passkey');
    const result = await authClient.signIn.passkey();
    if (result?.error) {
      toast.error(result.error.message ?? t('passkey.error.unknown'));
      setLoading(null);
      return;
    }
    const data = result?.data as { redirect?: boolean; url?: string } | null | undefined;
    onSignedIn(data?.redirect && data.url ? data.url : undefined);
  }

  const buttonClass =
    'flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-foreground/15 transition-colors hover:bg-muted active:bg-foreground/10 disabled:opacity-50';

  return (
    <div className="flex items-center justify-center gap-3">
      <button
        type="button"
        aria-label="Google"
        title="Google"
        className={buttonClass}
        disabled={disabled || loading !== null}
        onClick={() => void handleSocial('google')}
      >
        {loading === 'google' ? <Spinner /> : <FontAwesomeIcon icon={faGoogle} className="h-5 w-5" />}
      </button>
      <button
        type="button"
        aria-label="GitHub"
        title="GitHub"
        className={buttonClass}
        disabled={disabled || loading !== null}
        onClick={() => void handleSocial('github')}
      >
        {loading === 'github' ? <Spinner /> : <FontAwesomeIcon icon={faGithub} className="h-5 w-5" />}
      </button>
      <button
        type="button"
        aria-label={t('passkey.signIn')}
        title={t('passkey.signIn')}
        className={buttonClass}
        disabled={disabled || loading !== null}
        onClick={() => void handlePasskey()}
      >
        {loading === 'passkey' ? <Spinner /> : <FontAwesomeIcon icon={faFingerprint} className="h-5 w-5" />}
      </button>
    </div>
  );
}
