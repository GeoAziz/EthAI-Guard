import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Authentication - EthixAI Documentation',
  description: 'Learn how to authenticate users with Firebase Auth and secure API endpoints.',
};

export default function AuthenticationPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-4">Authentication</h1>
      <p className="text-lg text-muted-foreground mb-8">
        EthixAI uses Firebase Authentication for secure user management and JWT tokens for API access.
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-bold mb-4">Authentication Flow</h2>
          <Card>
            <CardContent className="pt-6">
              <ol className="space-y-4 text-muted-foreground">
                <li className="flex gap-3">
                  <Badge className="h-6 w-6 rounded-full flex items-center justify-center p-0">1</Badge>
                  <div>
                    <p className="font-semibold text-foreground">User signs in via Firebase</p>
                    <p className="text-sm">Email/password or social providers (Google, GitHub)</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Badge className="h-6 w-6 rounded-full flex items-center justify-center p-0">2</Badge>
                  <div>
                    <p className="font-semibold text-foreground">Firebase returns ID token</p>
                    <p className="text-sm">JWT token valid for 1 hour</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Badge className="h-6 w-6 rounded-full flex items-center justify-center p-0">3</Badge>
                  <div>
                    <p className="font-semibold text-foreground">Frontend includes token in API requests</p>
                    <p className="text-sm">Authorization: Bearer &lt;token&gt;</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Badge className="h-6 w-6 rounded-full flex items-center justify-center p-0">4</Badge>
                  <div>
                    <p className="font-semibold text-foreground">Backend verifies token</p>
                    <p className="text-sm">Checks signature, expiry, and claims</p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Frontend Integration</h2>
          <p className="text-muted-foreground mb-4">
            Use the Firebase SDK to handle authentication in your Next.js app.
          </p>
          <Card className="bg-muted mb-4">
            <CardHeader>
              <CardTitle className="text-base">Sign In</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm overflow-x-auto">
                {`import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth, 
      email, 
      password
    );
    const token = await userCredential.user.getIdToken();
    // Store token for API requests
    localStorage.setItem("authToken", token);
  } catch (error) {
    console.error("Sign in failed:", error);
  }
};`}
              </pre>
            </CardContent>
          </Card>

          <Card className="bg-muted">
            <CardHeader>
              <CardTitle className="text-base">Make Authenticated API Request</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm overflow-x-auto">
                {`const analyzeData = async (data: any) => {
  const token = localStorage.getItem("authToken");
  
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": \`Bearer \${token}\`
    },
    body: JSON.stringify(data)
  });
  
  return response.json();
};`}
              </pre>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Backend Verification</h2>
          <p className="text-muted-foreground mb-4">
            Verify Firebase tokens on the backend to secure API endpoints.
          </p>
          <Card className="bg-muted">
            <CardHeader>
              <CardTitle className="text-base">Python/FastAPI Example</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm overflow-x-auto">
                {`from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth

security = HTTPBearer()

async def verify_token(
    credentials: HTTPAuthorizationCredentials = Security(security)
):
    try:
        token = credentials.credentials
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials"
        )

# Use in endpoint
@app.post("/api/analyze")
async def analyze(
    data: AnalysisRequest,
    user = Depends(verify_token)
):
    # user contains decoded token claims (uid, email, etc.)
    result = perform_analysis(data, user["uid"])
    return result`}
              </pre>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Token Refresh</h2>
          <p className="text-muted-foreground mb-4">
            Firebase tokens expire after 1 hour. Implement automatic refresh to maintain session.
          </p>
          <Card className="bg-muted">
            <CardContent className="pt-6">
              <pre className="text-sm overflow-x-auto">
                {`import { onAuthStateChanged } from "firebase/auth";

onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Refresh token every 50 minutes
    const token = await user.getIdToken(true);
    localStorage.setItem("authToken", token);
  }
});`}
              </pre>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Best Practices</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">✓ Do</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Store tokens securely (httpOnly cookies preferred)</li>
                  <li>• Implement automatic token refresh</li>
                  <li>• Verify tokens on every API request</li>
                  <li>• Use HTTPS in production</li>
                  <li>• Handle expired token errors gracefully</li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">✗ Don't</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Store tokens in localStorage (XSS risk)</li>
                  <li>• Skip token verification on backend</li>
                  <li>• Use tokens past expiration</li>
                  <li>• Expose Firebase config publicly</li>
                  <li>• Trust client-side auth checks alone</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
