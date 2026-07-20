## EthixAI — Tech Stack & Rationale

This document lists the chosen tools for each layer with a short rationale.

Frontend
- Framework: React (Next.js) — server-side rendering for faster initial loads and easier SEO for public demo pages.
- Styling: Tailwind CSS — utility-first for fast UI iterations.
- Animations: Framer Motion — smooth, accessible interactions for ExplainBoard visuals.

Backend
- Primary ML API: FastAPI (Python) — async, easy to integrate with ML libraries (SHAP, LIME, AIF360), automatic OpenAPI docs.
- Auth/User Service: Express.js (Node) — small, familiar JS stack for session handling and potential integration with third-party auth providers.

AI Core
- Fairness libs: AIF360, plus custom statistical checks for subgroup parity.
- Explainability: SHAP, LIME for model-agnostic per-decision explanations.
- ML stack: scikit-learn, pandas, numpy.

Databases
- MongoDB — flexible schema for decision logs, SHAP outputs, and audit artifacts.
- PostgreSQL — relational user data, analytics, and ACID needs.

DevOps & CI/CD
- Containerization: Docker + docker-compose for local development.
- CI/CD: GitHub Actions for lint, test, and deploy.
- Hosting: Render / Hugging Face Spaces for public demo (backend on Render, UI on Netlify or Vercel as alternate).

Monitoring & Analytics
- Monitoring: Prometheus + Grafana for self-hosted metrics; consider Datadog for hosted.
- Lightweight option: use Hosted logs + Grafana Cloud for demo deployments.

Security & Privacy
- Data anonymization pipeline to remove PII before storage or model training.
- API access: API keys + role-based access for auditors vs devs.

Rationale Summary
- Python (FastAPI) for ML APIs because ML ecosystem (AIF360, SHAP) is Python-native.
- Node/Express for auth keeps session/user tooling in JS which pairs well with the React frontend.
- Hybrid DB choice strikes a balance: MongoDB for flexible audit artifacts and PostgreSQL for structured user/analytics data.
