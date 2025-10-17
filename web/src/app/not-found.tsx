import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background text-foreground p-8">
      <div className="max-w-xl w-full">
        <div className="bg-card text-card-foreground border border-border rounded-xl shadow-lg p-8 animate-fade-in">
          <h1 className="text-6xl md:text-7xl font-extrabold text-foreground mb-2 text-center">
            404
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-4 text-center">
            Whoops — this page wandered off to find snacks.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {/* This is the updated part */}
            <Link
              href="/"
              className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-md shadow hover:bg-primary/90 transition"
              aria-label="Go to homepage"
            >
              Take me home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}