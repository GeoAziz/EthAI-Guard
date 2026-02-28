export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-bold">You&apos;re offline</h1>
      <p className="text-muted-foreground max-w-md">
        It looks like you&apos;ve lost your internet connection. Please check your network and try again.
      </p>
      <a href="/" className="mt-4 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        Try again
      </a>
    </div>
  );
}
