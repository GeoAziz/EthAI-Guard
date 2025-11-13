import { Logo } from "@/components/logo";
import Link from "next/link";
import Image from "next/image";

export function AuthLayout({ children, title, description, quote }: { children: React.ReactNode, title: string, description: string, quote: string }) {
  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-md space-y-6">
          <div className="flex flex-col items-center text-center">
            <Link href="/" className="mb-6">
              <Logo />
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <p className="mt-2 text-muted-foreground">{description}</p>
          </div>
          {children}
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
         <Image
            src="https://picsum.photos/seed/auth/1200/1000"
            alt="Abstract neural network"
            fill
            className="object-cover opacity-20"
            data-ai-hint="neural network abstract"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background via-transparent to-primary/20" />
        <div className="relative flex h-full flex-col justify-end p-10 text-white">
          <div className="z-10">
            <blockquote className="space-y-2">
              <p className="text-lg font-medium">
                &ldquo;{quote}&rdquo;
              </p>
              <footer className="text-sm">- EthixAI Team</footer>
            </blockquote>
          </div>
        </div>
      </div>
    </div>
  );
}
