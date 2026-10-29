import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Container, CardContent, CardHeader } from '@Hashibutogarasu/ui';
import { SignUpForm } from '@/components/auth/sign-up-form';
import { getContinueTo } from '@/lib/redirect-server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t('signIn.createAccount') };
}

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Sign-up page, reached from the link button on the sign-in screen. */
export default async function SignUpPage({ searchParams }: Props) {
  const params = await searchParams;
  const t = await getTranslations();
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Container className="max-w-sm">
        <CardHeader className="text-lg font-semibold">{t('signIn.createAccount')}</CardHeader>
        <CardContent className="space-y-6">
          <SignUpForm continueTo={getContinueTo(params)} />
          <div className="flex justify-center">
            <Link href="/sign-in" className="text-sm font-medium text-primary hover:underline">
              {t('signIn.backToSignIn')}
            </Link>
          </div>
        </CardContent>
      </Container>
    </main>
  );
}
