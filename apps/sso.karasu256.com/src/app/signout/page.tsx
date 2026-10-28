import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { resolveRedirectTo } from '@/lib/redirect';
import { getServerConfig } from '@/lib/config';
import { SignOutClient } from './client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');
  return { title: t('signOut.title') };
}

interface Props {
  searchParams: Promise<{ next?: string | string[] }>;
}

/** Sign-out page. Clears the better-auth session then redirects to `?next`. */
export default async function SignOutPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const target = resolveRedirectTo(Array.isArray(next) ? next[0] : next, getServerConfig().trustedOrigins, '/sign-in');
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <SignOutClient next={target} />
    </main>
  );
}
