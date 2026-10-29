'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faCopy } from '@fortawesome/free-solid-svg-icons';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { AiOutlineInfoCircle } from 'react-icons/ai';
import { Button, Dialog, DialogBackdrop, DialogPopup, DialogPortal, DialogTitle, toast } from '@Hashibutogarasu/ui';
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
 * identity provider administrators, behind a round info icon button pinned
 * to the top-right of the sign-in page. The values are only needed while an
 * IdP connection is being set up, so they stay out of the way of the
 * sign-in flow itself and open in a dialog on demand.
 */
export function SamlConnectionInfoDialog() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const info = getSamlConnectionInfo(process.env.NEXT_PUBLIC_AUTH_API_URL ?? '');

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('sso.connection.title')}
        title={t('sso.connection.title')}
        className="absolute top-4 right-4 inline-flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <AiOutlineInfoCircle className="size-6" aria-hidden />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup className="max-w-md">
            <DialogTitle>{t('sso.connection.title')}</DialogTitle>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t('sso.connection.description')}</p>
              <ConnectionField label={t('sso.connection.metadataUrl')} value={info.metadataUrl} />
              <ConnectionField label={t('sso.connection.acsUrl')} value={info.acsUrl} />
              <ConnectionField label={t('sso.connection.entityId')} value={info.entityId} />
            </div>
          </DialogPopup>
        </DialogPortal>
      </Dialog>
    </>
  );
}
