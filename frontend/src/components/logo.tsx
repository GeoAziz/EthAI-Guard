import { ShieldCheck } from "lucide-react";

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <ShieldCheck className="h-6 w-6 text-primary" />
      <span className="font-bold text-lg text-foreground">EthixAI</span>
    </div>
  );
}
