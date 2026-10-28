'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, Fingerprint, KeyRound, LoaderCircle, LockKeyhole, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Input, Label, UserAvatar, toast } from '@Hashibutogarasu/ui';
import { authClient } from '@/lib/auth/client';
import { lookupSignIn, type SignInLookup } from '@/lib/sign-in-lookup';

export interface SignInFlowProps {
  continueTo: string;
  forceLogin: boolean;
  /** Error code the SSO flow came back with (e.g. an IdP-initiated failure), if any. */
  errorCode?: string;
}

const KNOWN_ERROR_CODES = ['provider_not_found', 'invalid_saml_response', 'replay_detected', 'unsolicited_response'] as const;

type Step = 'chooser' | 'email' | 'passkey' | 'methods' | 'password';

/** The sliding form panels, in order. The chooser is not part of the track. */
const FORM_STEPS: readonly Step[] = ['email', 'passkey', 'methods', 'password'];

interface DeviceSessionEntry {
  session: { token: string };
  user: { id: string; name: string; email: string; image?: string | null };
}

/** Indeterminate bar pinned to the top edge of the container while a step is working. */
function ProgressBar({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden
      className={`absolute inset-x-0 top-0 z-10 h-1 overflow-hidden bg-primary/15 transition-opacity duration-200 ${active ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="h-full w-1/3 bg-primary [animation:sign-in-progress_1.1s_ease-in-out_infinite]" />
    </div>
  );
}

/**
 * The SSO site's sign-in flow: a wide container with a key-mark panel on
 * the left and the working area on the right. It opens on an account
 * chooser listing the device sessions already signed in to Karasu Lab
 * (multi-session); picking one activates it and continues. Adding an
 * account asks for an email address first and looks up how that address
 * signs in: a domain with an SSO provider leaves for its identity
 * provider, an account with a passkey is asked for the passkey first, and
 * every other account reaches the password field through an explicit
 * "another way" method choice. The `continueTo` callback context is held
 * in this component's props for the whole flow, so no step loses it.
 */
export function SignInFlow({ continueTo, errorCode }: SignInFlowProps) {
  const t = useTranslations();
  const [sessions, setSessions] = useState<DeviceSessionEntry[] | null>(null);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [lookup, setLookup] = useState<SignInLookup | null>(null);
  const [methodsExpanded, setMethodsExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await authClient.multiSession.listDeviceSessions();
      if (cancelled) return;
      const entries = (data ?? []) as DeviceSessionEntry[];
      setSessions(entries);
      // With nothing signed in on this device there is nothing to choose,
      // so the flow starts directly on the add-account (email) step.
      setStep(entries.length > 0 ? 'chooser' : 'email');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!errorCode) return;
    const known = (KNOWN_ERROR_CODES as readonly string[]).includes(errorCode);
    toast.error(t(known ? `sso.error.${errorCode}` : 'sso.error.unknown'));
  }, [errorCode, t]);

  // While the email field is on screen, offer passkeys through the
  // browser's autofill (WebAuthn conditional mediation): picking one from
  // the field's suggestions signs in right away. Cancellation — including
  // the browser superseding this request with a modal ceremony — is
  // expected and stays silent.
  useEffect(() => {
    if (step !== 'email') return;
    let cancelled = false;
    void (async () => {
      const credentialApi = window.PublicKeyCredential as
        | (typeof PublicKeyCredential & { isConditionalMediationAvailable?: () => Promise<boolean> })
        | undefined;
      if (!credentialApi?.isConditionalMediationAvailable || !(await credentialApi.isConditionalMediationAvailable())) return;
      const { data, error } = await authClient.signIn.passkey({ autoFill: true });
      if (cancelled || error || !data) return;
      window.location.replace(continueTo);
    })();
    return () => {
      cancelled = true;
    };
  }, [step, continueTo]);

  async function selectAccount(entry: DeviceSessionEntry) {
    setBusy(true);
    const { error } = await authClient.multiSession.setActive({ sessionToken: entry.session.token });
    if (error) {
      toast.error(t('signIn.error.unknown'));
      const { data } = await authClient.multiSession.listDeviceSessions();
      setSessions((data ?? []) as DeviceSessionEntry[]);
      setBusy(false);
      return;
    }
    window.location.replace(continueTo);
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setEmailError(null);
    setPasskeyError(null);
    setPasswordError(null);
    setPassword('');
    try {
      const result = await lookupSignIn(email);
      setLookup(result);
      if (result.sso) {
        const { data, error } = await authClient.signIn.sso({ email, callbackURL: continueTo });
        const url = (data as { url?: string } | null)?.url;
        if (!error && url) {
          window.location.replace(url);
          return;
        }
        setEmailError(t('sso.error.provider_not_found'));
      } else if (!result.exists) {
        setEmailError(t('signIn.error.accountNotFound'));
      } else if (result.hasPasskey) {
        // A registered passkey is always asked for before anything else.
        setStep('passkey');
      } else if (result.hasPassword) {
        // Without a passkey, the password field is reached by explicitly
        // choosing it under "another way" on the methods step.
        setMethodsExpanded(false);
        setStep('methods');
      } else {
        setEmailError(t('signIn.error.noMethod'));
      }
    } catch {
      setEmailError(t('signIn.error.unknown'));
    }
    setBusy(false);
  }

  async function handlePasskey() {
    setBusy(true);
    setPasskeyError(null);
    const { error } = await authClient.signIn.passkey();
    if (error) {
      setPasskeyError(t('signIn.error.passkeyFailed'));
      setBusy(false);
      return;
    }
    // The passkey ceremony is discoverable-credential based, so confirm
    // it signed in the account whose email address was entered.
    const { data: session } = await authClient.getSession();
    if (session && session.user.email.toLowerCase() !== email.trim().toLowerCase()) {
      await authClient.signOut();
      setPasskeyError(t('signIn.error.passkeyMismatch'));
      setBusy(false);
      return;
    }
    window.location.replace(continueTo);
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setPasswordError(null);
    const { data, error } = await authClient.signIn.email({ email, password, callbackURL: continueTo });
    if (error) {
      setPasswordError(error.status === 401 ? t('signIn.error.invalidPassword') : t('signIn.error.unknown'));
      setBusy(false);
      return;
    }
    const url = (data as { url?: string } | null)?.url;
    window.location.replace(url ?? continueTo);
  }

  /** Small pill that names the entered address and slides back to the email step. */
  function emailChip(disabled: boolean) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setStep('email')}
        className="flex max-w-full items-center gap-1 rounded-full py-1 pr-3 pl-1 text-sm text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
      >
        <ChevronLeft className="h-4 w-4 shrink-0" />
        <span className="truncate">{email}</span>
      </button>
    );
  }

  const formStepIndex = Math.max(0, FORM_STEPS.indexOf(step));

  return (
    <div className="relative w-full max-w-3xl overflow-hidden rounded-xl bg-card text-sm text-card-foreground shadow-sm ring-1 ring-foreground/10">
      <ProgressBar active={busy} />
      <div className="flex">
        <div className="hidden w-[30%] shrink-0 items-center justify-center bg-muted/60 sm:flex" aria-hidden>
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-foreground/10">
            <KeyRound className="h-10 w-10 text-muted-foreground" />
          </div>
        </div>

        <div className="min-w-0 flex-1 p-6 sm:p-8">
          {sessions === null ? (
            <div className="flex min-h-48 items-center justify-center">
              <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : step === 'chooser' ? (
            <div>
              <h1 className="text-lg font-semibold">{t('signIn.chooser.title')}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t('signIn.chooser.description')}</p>

              <div className="mt-5 max-h-64 overflow-y-auto pr-1">
                <ul className="divide-y divide-foreground/10">
                  {sessions.map((entry) => (
                    <li key={entry.session.token}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void selectAccount(entry)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted disabled:opacity-50"
                      >
                        <UserAvatar uid={entry.user.id} iconUrl={entry.user.image} size={36} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{entry.user.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">{entry.user.email}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-3 border-t border-foreground/10 pt-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setStep('email')}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted disabled:opacity-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ring-foreground/15">
                    <Plus className="h-4.5 w-4.5" />
                  </span>
                  <span className="font-medium">{t('signIn.addAccount')}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden">
              <div className="flex transition-transform duration-300 ease-in-out" style={{ transform: `translateX(-${formStepIndex * 100}%)` }}>
                <form onSubmit={handleEmailSubmit} className="w-full shrink-0" aria-hidden={step !== 'email'}>
                  <h1 className="text-lg font-semibold">{t('signIn.title')}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">{t('signIn.emailDescription')}</p>
                  <div className="mt-6 space-y-2">
                    <Label htmlFor="sign-in-email">{t('signIn.email')}</Label>
                    <Input
                      id="sign-in-email"
                      name="email"
                      type="email"
                      autoComplete="email webauthn"
                      value={email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                      required
                      disabled={busy || step !== 'email'}
                    />
                    {emailError && <p className="text-sm text-destructive">{emailError}</p>}
                  </div>
                  <div className="mt-8 flex justify-end pr-1 pb-1">
                    <Button type="submit" disabled={busy || !email || step !== 'email'}>
                      {t('signIn.next')}
                    </Button>
                  </div>
                </form>

                <div className="w-full shrink-0" aria-hidden={step !== 'passkey'}>
                  {emailChip(busy || step !== 'passkey')}
                  <div className="mt-4 flex flex-col items-center text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                      <Fingerprint className="h-7 w-7 text-muted-foreground" />
                    </span>
                    <h1 className="mt-3 text-lg font-semibold">{t('signIn.passkey.title')}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">{t('signIn.passkey.description')}</p>
                  </div>
                  <div className="mt-6 space-y-2">
                    <Button type="button" className="w-full" disabled={busy || step !== 'passkey'} onClick={() => void handlePasskey()}>
                      {t('signIn.passkey.button')}
                    </Button>
                    {passkeyError && <p className="text-sm text-destructive">{passkeyError}</p>}
                  </div>
                  <div className="mt-6 flex justify-center">
                    <button
                      type="button"
                      disabled={busy || step !== 'passkey'}
                      onClick={() => {
                        setMethodsExpanded(true);
                        setStep('methods');
                      }}
                      className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
                    >
                      {t('signIn.methods.other')}
                    </button>
                  </div>
                </div>

                <div className="w-full shrink-0" aria-hidden={step !== 'methods'}>
                  {emailChip(busy || step !== 'methods')}
                  <h1 className="mt-2 text-lg font-semibold">{t('signIn.methods.title')}</h1>
                  {methodsExpanded ? (
                    <div className="mt-6">
                      {lookup?.hasPassword ? (
                        <button
                          type="button"
                          disabled={busy || step !== 'methods'}
                          onClick={() => setStep('password')}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ring-1 ring-foreground/10 transition-colors hover:bg-muted disabled:opacity-50"
                        >
                          <LockKeyhole className="h-5 w-5 shrink-0 text-muted-foreground" />
                          <span className="font-medium">{t('signIn.methods.password')}</span>
                        </button>
                      ) : (
                        <p className="text-sm text-muted-foreground">{t('signIn.methods.none')}</p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-6">
                      <Button type="button" disabled={busy || step !== 'methods'} onClick={() => setMethodsExpanded(true)}>
                        {t('signIn.methods.other')}
                      </Button>
                    </div>
                  )}
                </div>

                <form onSubmit={handlePasswordSubmit} className="w-full shrink-0" aria-hidden={step !== 'password'}>
                  {emailChip(busy || step !== 'password')}
                  <h1 className="mt-2 text-lg font-semibold">{t('signIn.passwordTitle')}</h1>
                  <div className="mt-6 space-y-2">
                    <Label htmlFor="sign-in-password">{t('signIn.password')}</Label>
                    <Input
                      id="sign-in-password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                      required
                      disabled={busy || step !== 'password'}
                    />
                    {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
                  </div>
                  <div className="mt-8 flex justify-end pr-1 pb-1">
                    <Button type="submit" disabled={busy || !password || step !== 'password'}>
                      {t('signIn.login')}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
