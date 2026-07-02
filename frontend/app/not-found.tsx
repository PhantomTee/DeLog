import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-32 text-center">
        <p className="font-mono text-sm" style={{ color: "#7342E2" }}>
          404
        </p>
        <h1 className="mt-4 text-3xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
          Page not found
        </h1>
        <p className="mt-3 opacity-70">That page doesn&apos;t exist, or it moved.</p>
        <Link
          href="/"
          className="mt-8 rounded-full px-6 py-3 font-semibold text-white"
          style={{ background: "#7342E2" }}
        >
          Back home
        </Link>
      </main>
    </div>
  );
}
