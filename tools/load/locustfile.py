from locust import HttpUser, task, between
import os
import random
import json


BACKEND_HOST = os.environ.get("BACKEND_HOST", "http://localhost:5000")


def example_payload():
    # Keep payload small and deterministic but varied enough for cache behavior
    size = random.randint(50, 120)
    data = {
        "features": [random.random() for _ in range(size)],
        "sensitive_attr": [random.choice([0, 1]) for _ in range(size)],
        "labels": [random.choice([0, 1]) for _ in range(size)],
    }
    return {"dataset_name": "synthetic", "data": data}


class EthAIUser(HttpUser):
    wait_time = between(0.05, 0.2)

    def on_start(self):
        self.host = BACKEND_HOST
        self.access_token = None
        self.email = f"user_{random.randint(1,10_000)}@example.com"
        self.password = "P@ssword1234!"
        self._ensure_user()

    def _ensure_user(self):
        # Try to register; ignore conflict; then login
        try:
            resp = self.client.post(
                "/auth/register",
                json={"name": "Load User", "email": self.email, "password": self.password},
                timeout=10,
            )
            if resp.status_code in (200, 400):  # 400 is user already exists
                pass
        except Exception:
            pass

        try:
            r = self.client.post(
                "/auth/login",
                json={"email": self.email, "password": self.password},
                timeout=10,
            )
            if r.ok:
                try:
                    self.access_token = r.json().get("accessToken")
                except Exception:
                    self.access_token = None
        except Exception:
            pass

    def _auth_headers(self):
        if not self.access_token:
            return {}
        return {"Authorization": f"Bearer {self.access_token}"}

    @task(2)
    def health(self):
        self.client.get("/health", timeout=5)

    @task(3)
    def analyze(self):
        payload = example_payload()
        headers = self._auth_headers()
        if not headers:
            self._ensure_user()
            headers = self._auth_headers()
        self.client.post("/analyze", json=payload, headers=headers, timeout=60)
