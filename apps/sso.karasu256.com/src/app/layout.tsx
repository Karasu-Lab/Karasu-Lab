import type { Metadata } from 'next';
import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import './globals.css';
import { Toaster } from '@Hashibutogarasu/ui';
import { geistSans, geistMono, notoSansJP } from '@Hashibutogarasu/ui/fonts';
import { FeatureFlagsProvider } from '@Hashibutogarasu/flags/server';
import { appFlags, appFlagsSchema } from '@/lib/flags';

config.autoAddCss = false;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations('Metadata');
  const siteTitle = t('siteTitle');
  const siteDescription = t('siteDescription');

  return {
    metadataBase: new URL('https://sso.karasu256.com'),
    title: { default: siteTitle, template: '%s' },
    description: siteDescription,
    openGraph: {
      title: siteTitle,
      description: siteDescription,
      siteName: 'Karasu Lab',
      locale,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: siteTitle,
      description: siteDescription,
    },
  };
}

/** Root layout — applies Geist fonts and full-height flex column. */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} ${notoSansJP.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased">
        <FeatureFlagsProvider flags={appFlags} schema={appFlagsSchema}>
          <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
          <Toaster />
        </FeatureFlagsProvider>
      </body>
    </html>
  );
}
