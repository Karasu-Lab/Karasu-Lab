'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faCopy } from '@fortawesome/free-solid-svg-icons';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button, Container, CardContent, CardHeader, toast } from '@Hashibutogarasu/ui';
import { getSamlConnectionInfo } from '@/lib/saml';

interface ConnectionFieldProps {
  label: string;
  value: string;
}

/** One labeled, copyable SAML connection value. */
function ConnectionField({ label, value }: ConnectionFieldProps) {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(t('sso.connection.copied'));
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Button type="button" variant="ghost" size="xs" onClick={handleCopy} aria-label={t('sso.connection.copy')}>
          <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
          {t('sso.connection.copy')}
        </Button>
      </div>
      <code className="block overflow-x-auto rounded-md bg-muted px-2 py-1.5 text-xs whitespace-nowrap">{value}</code>
    </div>
  );
}

/**
 * Publishes the SAML 2.0 Service Provider connection information for
 * identity provider administrators. This card is why sso.karasu256.com
 * exists as its own site: the values live here, next to the SSO sign-in
 * flow they belong to, instead of being exchanged out of band.
 */
export function SamlConnectionInfo() {
  const t = useTranslations();
  const info = getSamlConnectionInfo(process.env.NEXT_PUBLIC_AUTH_API_URL ?? '');

  return (
    <Container className="max-w-sm">
      <CardHeader className="text-lg font-semibold">{t('sso.connection.title')}</CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('sso.connection.description')}</p>
        <ConnectionField label={t('sso.connection.metadataUrl')} value={info.metadataUrl} />
        <ConnectionField label={t('sso.connection.acsUrl')} value={info.acsUrl} />
        <ConnectionField label={t('sso.connection.entityId')} value={info.entityId} />
      </CardContent>
    </Container>
  );
}
