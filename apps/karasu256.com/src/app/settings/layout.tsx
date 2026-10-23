import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getSessionUser, getSignInUrl } from '@Hashibutogarasu/utils/server';
import { SettingsShell } from '@/components/settings-shell';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t('settings.title') };
}

/**
 * Settings layout. Redirects unauthenticated users to auth.karasu256.com's
 * sign-in page, then renders the shared sidebar shell around the page content.
 */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await getSessionUser(process.env.NEXT_PUBLIC_AUTH_API_URL);
  if (!sessionUser) {
    redirect(await getSignInUrl(process.env.NEXT_PUBLIC_AUTH_URL, '/settings'));
  }
  const user = {
    uid: sessionUser.uid,
    displayName: sessionUser.name,
    email: sessionUser.email,
    photoURL: sessionUser.image,
  };
  return <SettingsShell user={user}>{children}</SettingsShell>;
}
