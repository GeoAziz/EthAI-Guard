import { Logo } from "@/components/logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const navItems = [
  "Overview",
  "Quick Start",
  "Authentication",
  "Data Format",
  "Fairness Metrics",
  "Explainability",
  "Compliance",
  "Contributing",
];

export default function DocsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
        <header className="mb-12 text-center">
            <div className="inline-block">
                <Logo />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mt-4">Documentation</h1>
            <p className="mt-4 text-lg text-muted-foreground">Your guide to building trustworthy AI with EthixAI.</p>
        </header>

        <div className="grid md:grid-cols-4 gap-8">
            <aside className="md:col-span-1 md:sticky top-20 h-fit">
                <h2 className="font-semibold text-lg mb-4">Table of Contents</h2>
                <ul className="space-y-2">
                    {navItems.map(item => (
                        <li key={item}>
                            <Link href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} className="text-muted-foreground hover:text-foreground transition-colors">
                                {item}
                            </Link>
                        </li>
                    ))}
                </ul>
            </aside>
            <main className="md:col-span-3 prose prose-invert max-w-none prose-headings:font-headline prose-headings:tracking-tight prose-a:text-primary prose-pre:bg-card prose-pre:border">
                <section id="overview">
                    <h2>Overview</h2>
                    <p>EthixAI provides a suite of tools to help developers and financial institutions build and deploy AI models that are fair, transparent, and compliant with ethical guidelines and regulations. This documentation will guide you through integrating and utilizing the EthixAI engine.</p>
                </section>
                
                <section id="quick-start">
                    <h2>Quick Start</h2>
                    <p>Get up and running in minutes.</p>
                    <pre><code>{`# 1. Install the CLI
npm install -g ethixai-cli

# 2. Login to your account
ethixai login

# 3. Run analysis on a CSV file
ethixai analyze ./path/to/your/data.csv --model ./path/to/your/model.pkl`}</code></pre>
                </section>

                <section id="data-format">
                    <h2>Data Format</h2>
                    <p>Your dataset should be a CSV file with a header row. Ensure that protected attributes (e.g., gender, race) and the target variable are clearly labeled.</p>
                </section>

                <section id="fairness-metrics">
                    <h2>Fairness Metrics</h2>
                    <p>We support a variety of fairness metrics, including:</p>
                    <ul>
                        <li><strong>Statistical Parity Difference:</strong> The difference in the rate of favorable outcomes received by unprivileged and privileged groups.</li>
                        <li><strong>Equal Opportunity Difference:</strong> The difference in true positive rates between unprivileged and privileged groups.</li>
                        <li><strong>Disparate Impact:</strong> The ratio of the rate of favorable outcomes for the unprivileged group to that of the privileged group.</li>
                    </ul>
                </section>
            </main>
        </div>
    </div>
  );
}
