from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Use package-relative imports so tests and runtime can import this module whether
# the package is loaded as `ai_core` or the module is executed directly.
from .routers import analyze, reports

app = FastAPI(title="EthixAI AI Core")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router)
app.include_router(reports.router)

@app.get("/health")
def health():
    return {"status": "ai_core ok"}
