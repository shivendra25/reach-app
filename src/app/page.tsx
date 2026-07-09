import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="flex flex-col items-center gap-8 text-center max-w-2xl">
        <span className="rounded-full border border-foreground/10 px-3 py-1 text-xs font-medium text-foreground/60">
          Pioneer cohort open · free while building
        </span>
        <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight">
          Find the audience that actually wants your app.
        </h1>
        <p className="text-lg sm:text-xl text-foreground/70">
          You built it. Reach tells you where your real users already hang out, what
          they&apos;ll pay, and how to reach them in their own language — so monetizing
          beats guessing.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/new"
            className="inline-flex h-12 items-center justify-center rounded-full bg-foreground px-6 text-background font-medium hover:opacity-90 transition"
          >
            Analyze my app
          </Link>
          <Link
            href="/how-it-works"
            className="inline-flex h-12 items-center justify-center rounded-full border border-foreground/15 px-6 font-medium hover:bg-foreground/[.04] transition"
          >
            How it works
          </Link>
        </div>
      </div>
    </main>
  );
}