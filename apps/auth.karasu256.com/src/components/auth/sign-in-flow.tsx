'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Fingerprint, KeyRound, LockKeyhole, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Input, Label, PasswordInput, SlideStep, SlideSteps } from '@Hashibutogarasu/ui';
import { authClient } from '@/lib/auth/client';
import { lookupSignIn, type SignInLookup } from '@/lib/sign-in-lookup';
import { ProviderButtons } from './provider-buttons';

export interface SignInFlowProps {
  continueTo: string;
  forceLogin: boolean;
}

type Step = 'email' | 'passkey' | 'methods' | 'password' | 'reset';

/** The sliding form panels, in order. */
const FORM_STEPS: readonly Step[] = ['email', 'passkey', 'methods', 'password', 'reset'];

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
 * The auth site's sign-in flow, in the same wide container as the SSO
 * site's: a key-mark panel on the left and sliding steps on the right.
 * Entering an email address looks up how that address signs in — a domain
 * with an SSO provider leaves for its identity provider, an account with
 * a passkey slides to the passkey step (with a way out to the other
 * methods when the ceremony fails or is cancelled), and every other
 * account slides straight to the password step. The password step's
 * "forgot password" link slides to a reset panel instead of leaving the
 * flow. Google, GitHub, and passkey also stay available as round icon
 * buttons under the email step, and a sign-up link button sits at the
 * container's bottom-left. The `continueTo` callback context is held in
 * this component's props for the whole flow, so no step loses it.
 */
export function SignInFlow({ continueTo, forceLogin }: SignInFlowProps) {
  const t = useTranslations();
  const { data: session } = authClient.useSession();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [lookup, setLookup] = useState<SignInLookup | null>(null);
  const [busy, setBusy] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  // A user who already has a session does not need this form, unless the
  // caller explicitly asked to sign in another account on top of it.
  useEffect(() => {
    if (session && !forceLogin) window.location.replace(continueTo);
  }, [session, forceLogin, continueTo]);

  function handleSignedIn(redirectUrl?: string) {
    window.location.replace(redirectUrl ?? continueTo);
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setEmailError(null);
    setPasskeyError(null);
    setPasswordError(null);
    setPassword('');
    setResetError(null);
    setResetSent(false);
    try {
      const result = await lookupSignIn(email);
      if (result.status === 'rate_limited') {
        setEmailError(
          result.retryAfterExact
            ? t('signIn.error.rateLimitedWithin', { minutes: result.retryAfterMinutes })
            : t('signIn.error.rateLimitedLessThan', { minutes: result.retryAfterMinutes })
        );
      } else if (result.status === 'not_found') {
        setEmailError(t('signIn.error.accountNotFound'));
      } else {
        setLookup(result.lookup);
        if (result.lookup.sso) {
          const { data, error } = await authClient.signIn.sso({ email, callbackURL: continueTo });
          const url = (data as { url?: string } | null)?.url;
          if (!error && url) {
            window.location.replace(url);
            return;
          }
          setEmailError(t('signIn.error.unknown'));
        } else if (result.lookup.hasPasskey) {
          // A registered passkey is always asked for before anything else.
          setStep('passkey');
        } else if (result.lookup.hasPassword) {
          setStep('password');
        } else {
          setEmailError(t('signIn.error.noMethod'));
        }
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
    const { data: current } = await authClient.getSession();
    if (current && current.user.email.toLowerCase() !== email.trim().toLowerCase()) {
      await authClient.signOut();
      setPasskeyError(t('signIn.error.passkeyMismatch'));
      setBusy(false);
      return;
    }
    handleSignedIn();
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
    handleSignedIn(url);
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResetError(null);
    // The redirectTo must be absolute: the auth API resolves a relative
    // path against its own origin when it redirects after verifying the
    // token, which lands the user on the API host instead of this page.
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password/confirm`,
    });
    if (error) {
      setResetError(t('resetPassword.sendError'));
      setBusy(false);
      return;
    }
    setResetSent(true);
    setBusy(false);
  }

  /** Small pill that names the entered address and slides back to an earlier step. */
  function backChip(target: Step, disabled: boolean) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setStep(target)}
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
      <Link href="/sign-up" className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
        <UserPlus className="h-4 w-4" />
        {t('signIn.createAccount')}
      </Link>
      <div className="flex">
        <div className="hidden w-[30%] shrink-0 items-center justify-center bg-muted/60 sm:flex" aria-hidden>
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-foreground/10">
            <KeyRound className="h-10 w-10 text-muted-foreground" />
          </div>
        </div>

        <div className="min-w-0 flex-1 p-6 pb-12 sm:p-8 sm:pb-12">
          <SlideSteps index={formStepIndex}>
            <SlideStep aria-hidden={step !== 'email'}>
              <form onSubmit={handleEmailSubmit}>
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

              <div className="mt-8 flex items-center gap-3">
                <span className="h-px flex-1 bg-foreground/10" />
                <span className="text-xs text-muted-foreground">{t('signIn.or')}</span>
                <span className="h-px flex-1 bg-foreground/10" />
              </div>
              <div className="mt-5">
                <ProviderButtons continueTo={continueTo} onSignedIn={handleSignedIn} disabled={busy || step !== 'email'} />
              </div>
            </SlideStep>

            <SlideStep aria-hidden={step !== 'passkey'}>
              {backChip('email', busy || step !== 'passkey')}
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
                  onClick={() => setStep('methods')}
                  className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
                >
                  {t('signIn.methods.other')}
                </button>
              </div>
            </SlideStep>

            <SlideStep aria-hidden={step !== 'methods'}>
              {backChip('email', busy || step !== 'methods')}
              <h1 className="mt-2 text-lg font-semibold">{t('signIn.methods.title')}</h1>
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
            </SlideStep>

            <SlideStep aria-hidden={step !== 'password'}>
              <form onSubmit={handlePasswordSubmit}>
                {backChip('email', busy || step !== 'password')}
                <h1 className="mt-2 text-lg font-semibold">{t('signIn.passwordTitle')}</h1>
                <div className="mt-6 space-y-2">
                  <Label htmlFor="sign-in-password">{t('signIn.password')}</Label>
                  <PasswordInput
                    id="sign-in-password"
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    required
                    disabled={busy || step !== 'password'}
                  />
                  {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    disabled={busy || step !== 'password'}
                    onClick={() => setStep('reset')}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                  >
                    {t('signIn.forgotPassword')}
                  </button>
                </div>
                <div className="mt-6 flex justify-end pr-1 pb-1">
                  <Button type="submit" disabled={busy || !password || step !== 'password'}>
                    {t('signIn.submit')}
                  </Button>
                </div>
              </form>
            </SlideStep>

            <SlideStep aria-hidden={step !== 'reset'}>
              {backChip('password', busy || step !== 'reset')}
              <h1 className="mt-2 text-lg font-semibold">{t('resetPassword.title')}</h1>
              {resetSent ? (
                <div className="mt-4 space-y-4">
                  <p className="text-sm text-muted-foreground">{t('resetPassword.sent', { email })}</p>
                  <Button type="button" variant="outline" disabled={step !== 'reset'} onClick={() => setStep('password')}>
                    {t('resetPassword.backToSignIn')}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleResetSubmit}>
                  <p className="mt-1 text-sm text-muted-foreground">{t('resetPassword.description')}</p>
                  <div className="mt-6 space-y-2">{resetError && <p className="text-sm text-destructive">{resetError}</p>}</div>
                  <div className="mt-6 flex justify-end pr-1 pb-1">
                    <Button type="submit" disabled={busy || step !== 'reset'}>
                      {busy ? t('resetPassword.sending') : t('resetPassword.sendLink')}
                    </Button>
                  </div>
                </form>
              )}
            </SlideStep>
          </SlideSteps>
        </div>
      </div>
    </div>
  );
}
