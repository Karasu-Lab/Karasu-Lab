import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SignInFlow } from '@/components/auth/sign-in-flow';
import { getContinueTo } from '@/lib/redirect-server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');
  return { title: t('signIn.title') };
}

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Sign-in page for unauthenticated users. */
export default async function SignInPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <SignInFlow continueTo={getContinueTo(params)} forceLogin={params.prompt === 'login'} />
    </main>
  );
}
