"use client"
import Link from 'next/link'

export default function NotFound() {
  return (
    <main role="main" className="min-h-screen flex items-center justify-center p-8 bg-background text-foreground">
      <div className="max-w-xl text-center">
        <h1 className="text-4xl font-semibold mb-2">Page not found</h1>
        <p className="text-muted-foreground mb-6">The page you tried to visit doesn't exist or you may need to sign in.</p>
        <Link href="/" className="inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground focus-ring">
          Go to Home
        </Link>
      </div>
    </main>
  )
}
