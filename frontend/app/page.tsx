export default function Home() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center px-4 py-10 sm:px-6">
      <div className="flex max-w-2xl flex-col gap-4">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Public area
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Hypothetical credit card company
        </h1>
        <p className="text-base text-muted-foreground sm:text-lg">
          Credit card transaction management.
        </p>
      </div>
    </main>
  );
}
