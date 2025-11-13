## EthixAI — System Architecture

Below is a high-level system architecture for EthixAI. It shows major components, data flows, and integration points.

```mermaid
flowchart TB
  subgraph Frontend
    A[React Dashboard\n(Next.js/Tailwind/Framer Motion)]
  end

  subgraph API
    B[FastAPI ML APIs]\nC[Express Auth & User Service]
  end

  subgraph AI_Core
    D[FairLens Engine\n(AIF360, custom checks)]
    E[ExplainBoard\n(SHAP/LIME wrappers)]
  end

  subgraph Storage
    F[(MongoDB)\nDecision logs & audit trails]
    G[(PostgreSQL)\nUser & analytics]
  end

  subgraph Infra
    H[CI/CD (GitHub Actions)]
    I[Monitoring (Prometheus/Grafana)]
  end

  A -->|API calls| B
  A -->|Auth| C
  B --> D
  B --> E
  D --> F
  E --> F
  C --> G
  B --> F
  H -.-> B
  H -.-> A
  I -.-> B
  I -.-> A

  %% Data flow example
  subgraph DataFlow[Data Flow]
    Input[Input: model predictions, features] --> Processing[Processing: anonymization & preprocessing]
    Processing --> Fairness[Fairness Analysis: AIF360, custom metrics]
    Fairness --> Reporting[Reporting: Compliance score, audit logs]
    Reporting --> Dashboard[Dashboard visualizations]
  end
  Input --> Processing --> Fairness --> Reporting --> Dashboard
```

Notes
- The frontend communicates with two API layers: a Python FastAPI service that exposes ML/fairness endpoints and a lightweight Node/Express service for auth, user profiles, and session handling.
- Decision logs, raw explainability outputs, and audit artifacts are stored in MongoDB; analytical aggregates and user management live in PostgreSQL.
- The AI Core modules (FairLens, ExplainBoard) are designed as Python services/libraries wrapped by FastAPI for easy integration with the dashboard.
- CI/CD pipelines run tests, linting, and deploy to staging. Monitoring uses lightweight Prometheus/Grafana or hosted alternatives.
