'use client';

import { useState } from 'react';
import { LoaderCircle, PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { startRegistration, type PublicKeyCredentialCreationOptionsJSON, type RegistrationResponseJSON } from '@simplewebauthn/browser';
import { Button, Input, Label, toast, Dialog, DialogPortal, DialogBackdrop, DialogPopup, DialogTitle } from '@Hashibutogarasu/ui';
import { authClient } from '@/lib/auth/client';

interface PasskeyCreateDialogProps {
  /** Called after a passkey is successfully registered. */
  onSuccess?: () => void;
}

/** The verified-registration payload, held between the ceremony and the name dialog. */
type PendingRegistration = Omit<RegistrationResponseJSON, 'clientExtensionResults'>;

/**
 * A plus-icon button that registers a new passkey.
 *
 * Clicking the button starts the WebAuthn registration ceremony right
 * away. Only once the authenticator has created and verified the
 * credential does the name dialog open — prefilled with the display name
 * the authenticator was given for this account — and pressing register
 * there completes the registration, linking the passkey to the signed-in
 * account.
 *
 * The ceremony is driven through the same two endpoints
 * `authClient.passkey.addPasskey` uses internally
 * (`/passkey/generate-register-options` and
 * `/passkey/verify-registration`), split so the name can be asked for in
 * between. Clicking the button calls {@link e.stopPropagation} so it does
 * not toggle any parent accordion trigger.
 */
export function PasskeyCreateDialog({ onSuccess }: PasskeyCreateDialogProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [registering, setRegistering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<PendingRegistration | null>(null);

  async function handleAdd(e: React.MouseEvent) {
    e.stopPropagation();
    setRegistering(true);
    try {
      const { data: options, error } = await authClient.$fetch<PublicKeyCredentialCreationOptionsJSON>('/passkey/generate-register-options', {
        method: 'GET',
      });
      if (error || !options) {
        toast.error(error?.message ?? t('passkey.error.unknown'));
        return;
      }
      const registration = await startRegistration({ optionsJSON: options });
      const { clientExtensionResults: _clientExtensionResults, ...responseBody } = registration;
      setPending(responseBody);
      // The authenticator initially labels the credential with the user
      // name from the registration options, so offer that as the name.
      setName(options.user.displayName ?? options.user.name ?? '');
      setOpen(true);
    } catch {
      toast.error(t('passkey.error.unknown'));
    } finally {
      setRegistering(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pending) return;
    setSaving(true);
    const { error } = await authClient.$fetch('/passkey/verify-registration', {
      method: 'POST',
      body: { response: pending, name },
    });
    if (error) {
      toast.error(error.message ?? t('passkey.error.unknown'));
    } else {
      setPending(null);
      setName('');
      setOpen(false);
      toast.success(t('passkey.registered'), { autoClose: true });
      onSuccess?.();
    }
    setSaving(false);
  }

  return (
    <>
      <Button variant="ghost" size="icon-sm" aria-label={t('passkey.register')} disabled={registering} onClick={(e) => void handleAdd(e)}>
        {registering ? <LoaderCircle className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup>
            <DialogTitle>{t('passkey.register')}</DialogTitle>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dialog-passkey-name">{t('passkey.name')}</Label>
                <Input
                  id="dialog-passkey-name"
                  type="text"
                  placeholder={t('passkey.namePlaceholder')}
                  value={name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  required
                  disabled={saving}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  {t('dangerZone.cancel')}
                </Button>
                <Button type="submit" disabled={saving || !name.trim()}>
                  {saving ? t('passkey.registering') : t('passkey.register')}
                </Button>
              </div>
            </form>
          </DialogPopup>
        </DialogPortal>
      </Dialog>
    </>
  );
}
