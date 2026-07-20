# Architecture — EthixAI

Overview

EthixAI is a small demo stack demonstrating model explainability and fairness analysis. The system components are:

- frontend — Next.js application that provides the web UI for dataset upload, running analyses and viewing persisted reports.
- system_api (backend) — Node/Express service that handles auth, persists reports to MongoDB, and forwards analysis requests to ai_core.
- ai_core — Python FastAPI service that trains a quick model, computes SHAP explanations and fairness summaries, and returns results (with a PNG fallback when plotting libs are unavailable).
- mongo — MongoDB used to persist reports and analysis metadata.
- postgres — Optional relational DB for future features (included for completeness in compose).

Communication flows

1. User uploads a dataset from the frontend which POSTs to `system_api`.
2. `system_api` validates/authenticates the request, then forwards the dataset to `ai_core`'s analyze endpoint defined by `AI_CORE_URL`.
3. `ai_core` trains a small model, computes SHAP values and fairness metrics, persists the analysis record to MongoDB, and returns a `reportId` / `analysisId`.
4. `system_api` stores the report metadata and returns the report id to the frontend.
5. The frontend can fetch the persisted report and render the summary, SHAP visuals (or PNG fallback), and fairness charts.

Deployment

Local demo uses Docker Compose: `docker compose up --build` to start all services. Environment variables are managed via `.env` or the docker-compose environment section; see `.env.example` for required variables.

Notes

- The `ai_core` container may require additional system build dependencies if building scientific packages (SHAP, NumPy, SciPy) from source. For demo, the Dockerfile includes these deps.
- For quick demos or tests, the backend supports an in-memory mode (set `USE_IN_MEMORY_DB=1`) so no external Mongo is required.
