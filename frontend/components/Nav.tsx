import Link from "next/link";

export function Nav() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
          Zamance
        </Link>
        <nav className="flex items-center gap-6 text-sm text-foreground/70">
          <Link href="/#how-it-works" className="hover:text-foreground">
            How it works
          </Link>
          <Link href="/dashboard" className="hover:text-foreground">
            Dashboard
          </Link>
          <Link
            href="/add-to-slack"
            className="rounded-full bg-accent px-4 py-2 font-medium text-white hover:bg-accent-soft"
          >
            Add to Slack
          </Link>
        </nav>
      </div>
    </header>
  );
}
