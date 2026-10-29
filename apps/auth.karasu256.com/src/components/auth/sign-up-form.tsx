'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus } from '@fortawesome/free-solid-svg-icons';
import { useTranslations } from 'next-intl';
import { toast } from '@Hashibutogarasu/ui';
import { authClient } from '@/lib/auth/client';
import { Button, Checkbox, Input, Label, PasswordInput } from '@Hashibutogarasu/ui';
import { LocalizedPasswordStrengthIndicator } from './localized-password-strength-indicator';

export interface SignUpFormProps {
  continueTo: string;
}

/**
 * Account creation form: email and password with a strength indicator and
 * a terms agreement, against better-auth. On success it continues to the
 * already-validated `continueTo` URL, like the sign-in flow does.
 */
export function SignUpForm({ continueTo }: SignUpFormProps) {
  const t = useTranslations();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const registerDisabled = loading || !email || !password || !agreedToTerms;
  const termsUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/terms`;

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await authClient.signUp.email(
      { email, password, name: email },
      {
        onSuccess: (ctx) => {
          const data = ctx.data as { redirect?: boolean; url?: string } | null;
          window.location.replace(data?.redirect && data.url ? data.url : continueTo);
        },
        onError: (ctx) => {
          toast.error(ctx.error.message);
          setLoading(false);
        },
      }
    );
  }

  return (
    <form onSubmit={handleRegister} className="space-y-4">
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
          disabled={loading}
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
          disabled={loading}
        />
        <LocalizedPasswordStrengthIndicator password={password} />
      </div>
      <div className="flex items-start gap-2">
        <Checkbox id="register-terms" checked={agreedToTerms} onCheckedChange={setAgreedToTerms} className="mt-0.5" disabled={loading} />
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
  );
}
