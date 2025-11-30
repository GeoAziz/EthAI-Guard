import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Installation - EthixAI Documentation',
  description: 'Install and configure EthixAI using Docker Compose or manual setup.',
};

export default function InstallationPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-4">Installation</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Set up EthixAI locally using Docker Compose or manual installation.
      </p>

      <div className="space-y-8">
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-2xl font-bold">Docker Compose (Recommended)</h2>
            <Badge variant="secondary">Easiest</Badge>
          </div>
          <p className="text-muted-foreground mb-4">
            The fastest way to get EthixAI running with all services configured.
          </p>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">Prerequisites</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Docker Desktop (or Docker Engine + Docker Compose)</li>
                <li>4GB RAM minimum (8GB recommended)</li>
                <li>10GB free disk space</li>
              </ul>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <div>
              <p className="font-semibold mb-2">1. Clone the repository</p>
              <Card className="bg-muted">
                <CardContent className="pt-6">
                  <pre className="text-sm overflow-x-auto">
                    git clone https://github.com/ethixai/ethixai.git
                    cd ethixai
                  </pre>
                </CardContent>
              </Card>
            </div>

            <div>
              <p className="font-semibold mb-2">2. Configure environment variables</p>
              <Card className="bg-muted">
                <CardContent className="pt-6">
                  <pre className="text-sm overflow-x-auto">
                    cp .env.example .env
                    # Edit .env with your Firebase credentials
                  </pre>
                </CardContent>
              </Card>
            </div>

            <div>
              <p className="font-semibold mb-2">3. Start all services</p>
              <Card className="bg-muted">
                <CardContent className="pt-6">
                  <pre className="text-sm overflow-x-auto">
                    docker-compose up -d
                  </pre>
                </CardContent>
              </Card>
            </div>

            <div>
              <p className="font-semibold mb-2">4. Access the application</p>
              <Card>
                <CardContent className="pt-6">
                  <ul className="space-y-2 text-sm">
                    <li><strong>Frontend:</strong> <a href="http://localhost:3000" className="text-primary hover:underline">http://localhost:3000</a></li>
                    <li><strong>Backend API:</strong> <a href="http://localhost:8000" className="text-primary hover:underline">http://localhost:8000</a></li>
                    <li><strong>AI Core:</strong> <a href="http://localhost:8001" className="text-primary hover:underline">http://localhost:8001</a></li>
                    <li><strong>Prometheus:</strong> <a href="http://localhost:9090" className="text-primary hover:underline">http://localhost:9090</a></li>
                    <li><strong>Grafana:</strong> <a href="http://localhost:3001" className="text-primary hover:underline">http://localhost:3001</a></li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Manual Installation</h2>
          <p className="text-muted-foreground mb-4">
            For development or custom deployments, install components individually.
          </p>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Frontend</CardTitle>
              </CardHeader>
              <CardContent>
                <Card className="bg-muted mb-3">
                  <CardContent className="pt-6">
                    <pre className="text-sm overflow-x-auto">
                      cd frontend
                      npm install
                      npm run dev
                    </pre>
                  </CardContent>
                </Card>
                <p className="text-sm text-muted-foreground">Runs on port 3000</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Backend</CardTitle>
              </CardHeader>
              <CardContent>
                <Card className="bg-muted mb-3">
                  <CardContent className="pt-6">
                    <pre className="text-sm overflow-x-auto">
                      cd backend
                      python -m venv venv
                      source venv/bin/activate  # Windows: venv\Scripts\activate
                      pip install -r requirements.txt
                      uvicorn main:app --reload --port 8000
                    </pre>
                  </CardContent>
                </Card>
                <p className="text-sm text-muted-foreground">Runs on port 8000</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Core</CardTitle>
              </CardHeader>
              <CardContent>
                <Card className="bg-muted mb-3">
                  <CardContent className="pt-6">
                    <pre className="text-sm overflow-x-auto">
                      cd ai_core
                      python -m venv venv
                      source venv/bin/activate
                      pip install -r requirements.txt
                      uvicorn main:app --reload --port 8001
                    </pre>
                  </CardContent>
                </Card>
                <p className="text-sm text-muted-foreground">Runs on port 8001</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Verification</h2>
          <p className="text-muted-foreground mb-4">
            Test your installation with these health checks:
          </p>
          <Card className="bg-muted">
            <CardContent className="pt-6">
              <pre className="text-sm overflow-x-auto">
                # Backend health check
                curl http://localhost:8000/health

                # AI Core health check
                curl http://localhost:8001/health

                # Expected response:
                {'{"status": "healthy", "version": "1.0.0"}'}
              </pre>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
