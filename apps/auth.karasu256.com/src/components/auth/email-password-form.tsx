'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRightToBracket, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import { useTranslations } from 'next-intl';
import { toast } from '@Hashibutogarasu/ui';
import { authClient } from '@/lib/auth/client';
import { Button, Checkbox, Input, Label, PasswordInput } from '@Hashibutogarasu/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger, AnimatedHeight } from '@Hashibutogarasu/ui';
import { LocalizedPasswordStrengthIndicator } from './localized-password-strength-indicator';

export interface EmailPasswordFormProps {
  /** Called after a successful sign-in or account creation, with the URL better-auth asked to continue to, if any. */
  onSuccess: (redirectUrl?: string) => void;
  /** Disables all inputs and buttons, e.g. while the caller's session state hasn't loaded yet. Defaults to `false`. */
  disabled?: boolean;
  /** Called with the current email address whenever it changes, so the surrounding card can react to it. */
  onEmailChange?: (email: string) => void;
}

/**
 * Renders a tabbed email/password form that handles both sign-in and account
 * creation against better-auth. Both tabs share the same email and password
 * state so the user can fill in credentials once and choose the action.
 */
export function EmailPasswordForm({ onSuccess, disabled = false, onEmailChange }: EmailPasswordFormProps) {
  const t = useTranslations();
  const [tab, setTab] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    onEmailChange?.(email);
  }, [email, onEmailChange]);

  const activeIndex = tab === 'signin' ? 0 : 1;
  const registerDisabled = disabled || loading || !email || !password || !agreedToTerms;
  const termsUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/terms`;

  function handleSuccess(ctx: { data: unknown }) {
    const data = ctx.data as { redirect?: boolean; url?: string } | null;
    onSuccess(data?.redirect && data.url ? data.url : undefined);
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await authClient.signIn.email(
      { email, password },
      {
        onSuccess: handleSuccess,
        onError: (ctx) => {
          toast.error(ctx.error.message);
          setLoading(false);
        },
      }
    );
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await authClient.signUp.email(
      { email, password, name: email },
      {
        onSuccess: handleSuccess,
        onError: (ctx) => {
          toast.error(ctx.error.message);
          setLoading(false);
        },
      }
    );
  }

  return (
    <AnimatedHeight>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="relative w-full">
          <div
            aria-hidden="true"
            className="absolute top-[3px] bottom-[3px] left-[3px] rounded-md bg-background shadow-sm pointer-events-none"
            style={{
              width: 'calc(50% - 3px)',
              transform: `translateX(calc(${activeIndex} * 100%))`,
              transition: 'transform 240ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
          <TabsTrigger value="signin" className="relative z-10 data-active:bg-transparent data-active:shadow-none">
            {t('signIn.tabs.signIn')}
          </TabsTrigger>
          <TabsTrigger value="register" className="relative z-10 data-active:bg-transparent data-active:shadow-none">
            {t('signIn.tabs.createAccount')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="signin">
          <form onSubmit={handleSignIn} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="signin-email">{t('signIn.email')}</Label>
              <Input
                id="signin-email"
                name="username"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="signin-password">{t('signIn.password')}</Label>
                <Link href="/reset-password" className="text-xs leading-none text-muted-foreground hover:text-foreground transition-colors">
                  {t('signIn.forgotPassword')}
                </Link>
              </div>
              <PasswordInput
                id="signin-password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                disabled={disabled}
              />
            </div>
            <Button type="submit" className="w-full" disabled={disabled || loading}>
              <FontAwesomeIcon icon={faRightToBracket} />
              {loading ? t('signIn.signingIn') : t('signIn.submit')}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="register">
          <form onSubmit={handleRegister} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="register-email">{t('signIn.email')}</Label>
              <Input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-password">{t('signIn.password')}</Label>
              <PasswordInput
                id="register-password"
                name="new-password"
                autoComplete="new-password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                disabled={disabled}
              />
              <LocalizedPasswordStrengthIndicator password={password} />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="register-terms" checked={agreedToTerms} onCheckedChange={setAgreedToTerms} className="mt-0.5" disabled={disabled} />
              <Label htmlFor="register-terms" className="font-normal text-sm leading-snug">
                {t.rich('signIn.agreeToTerms', {
                  terms: (chunks) => (
                    <a href={termsUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
                      {chunks}
                    </a>
                  ),
                })}
              </Label>
            </div>
            <Button type="submit" className="w-full" disabled={registerDisabled}>
              <FontAwesomeIcon icon={faUserPlus} />
              {loading ? t('signIn.creatingAccount') : t('signIn.createAccount')}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </AnimatedHeight>
  );
}
