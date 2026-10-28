import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SamlConnectionInfo } from '@/components/sso/saml-connection-info';
import { SsoSignInCard } from '@/components/sso/sso-sign-in-card';
import { getContinueTo } from '@/lib/redirect-server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');
  return { title: t('signIn.title') };
}

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** SSO sign-in page: the SSO counterpart of auth.karasu256.com's sign-in page, plus the SAML connection information. */
export default async function SignInPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <SsoSignInCard continueTo={getContinueTo(params)} forceLogin={params.prompt === 'login'} errorCode={first(params.error)} />
      <SamlConnectionInfo />
    </main>
  );
}
