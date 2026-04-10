'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { LoginForm } from '@/components/login-form';
import { Button } from '@/components/ui/button';

interface AuthDialogProps {
  defaultMode?: 'login' | 'register';
  description?: string;
  openLabel: string;
  title?: string;
  triggerClassName?: string;
  triggerVariant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'link' | 'destructive';
}

export function AuthDialog({
  defaultMode = 'login',
  description,
  openLabel,
  title = 'Access your account',
  triggerClassName,
  triggerVariant = 'default',
}: AuthDialogProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <>
      <Button className={triggerClassName} onClick={() => setOpen(true)} variant={triggerVariant}>
        {openLabel}
      </Button>

      {open && createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60">
          <button
            type="button"
            aria-label="Close authentication dialog"
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
          />

          <div className="flex min-h-full items-center justify-center px-4 py-6">
            <div
              aria-describedby={description ? 'auth-dialog-description' : undefined}
              aria-labelledby="auth-dialog-title"
              aria-modal="true"
              role="dialog"
              className="relative z-10 w-full max-w-md"
            >
              <div className="mb-3 flex items-start justify-between gap-4 text-white">
                <div>
                  <p id="auth-dialog-title" className="text-lg font-semibold tracking-tight">
                    {title}
                  </p>
                  {description && (
                    <p id="auth-dialog-description" className="text-sm text-white/75">
                      {description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="text-sm text-white/70 transition-colors hover:text-white"
                  onClick={() => setOpen(false)}
                >
                  Close
                </button>
              </div>

              <LoginForm defaultMode={defaultMode} onSuccess={() => setOpen(false)} redirectTo={null} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
