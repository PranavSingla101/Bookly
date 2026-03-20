import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";

export default async function LandingPage() {
  const { userId } = await auth();
  const ctaHref = userId ? "/library" : "/sign-in";
  const ctaLabel = userId ? "Go to Library" : "Sign in";

  return (
    <main className="min-h-screen px-6 py-6">
      <header className="flex justify-end">
        <Button asChild>
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
      </header>

      <section className="mx-auto mt-24 max-w-2xl text-center">
        <h1 className="text-3xl font-semibold">Elib</h1>
        <p className="mt-4 text-muted-foreground">
          Upload EPUB files and manage them in your personal library.
        </p>
      </section>
    </main>
  );
}
