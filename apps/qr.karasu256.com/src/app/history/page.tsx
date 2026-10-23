import { getTranslations } from 'next-intl/server';
import { getSessionUser } from '@Hashibutogarasu/utils/server';
import { HistoryTable } from '@/components/HistoryTable';
import { listQrGenerations } from '@/lib/history';

interface HistoryPageProps {
  searchParams: Promise<{ p?: string }>;
}

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const { p } = await searchParams;
  const page = Math.max(1, Number.parseInt(p ?? '1', 10) || 1);
  const t = await getTranslations('history');

  const sessionUser = await getSessionUser(process.env.NEXT_PUBLIC_AUTH_API_URL, process.env.VERCEL_PROTECTION_BYPASS_SECRET);
  if (!sessionUser) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-muted-foreground">{t('signInRequired')}</p>
      </div>
    );
  }

  const { items, totalPages } = await listQrGenerations(sessionUser.uid, page);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <HistoryTable
        items={items.map((item) => ({ id: item.id, url: item.url, createdAt: item.createdAt.toISOString() }))}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
