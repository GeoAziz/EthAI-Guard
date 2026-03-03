'use client';

import { Button } from '@/components/ui/button';

export function DiscordNotificationForm() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = (e.target as HTMLFormElement).email?.value;
    if (email) {
      alert(`Thank you! We'll notify ${email} when Discord launches.`);
      (e.target as HTMLFormElement).reset();
    }
  };

  return (
    <form className="flex gap-2 max-w-md mx-auto" onSubmit={handleSubmit}>
      <input
        type="email"
        name="email"
        placeholder="your.email@example.com"
        className="flex-1 px-4 py-2 rounded-md border bg-background text-sm"
        required
      />
      <Button type="submit">
        Notify Me
      </Button>
    </form>
  );
}
