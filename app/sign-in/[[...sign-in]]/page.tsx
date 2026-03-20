import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <SignIn path="/sign-in" forceRedirectUrl="/library" signUpUrl="/sign-up" />
    </main>
  );
}
