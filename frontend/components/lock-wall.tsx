import { AuthDialog } from './auth-dialog';

export default function LockWall() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/88 p-6 backdrop-blur-sm">
      <div className="flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-border/60 bg-card p-6 text-center shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Locked checkout
          </p>
          <h3 className="text-2xl font-semibold tracking-tight">
            Log in before completing the payment
          </h3>
          <p className="text-sm leading-6 text-muted-foreground">
            We only allow authenticated customers to submit credit card details and create
            transactions.
          </p>
        </div>

        <AuthDialog
          openLabel="Log in or create account"
          description="Authenticate first to unlock the checkout and submit the payment."
          triggerClassName="w-full"
        />
      </div>
    </div>
  );
}
