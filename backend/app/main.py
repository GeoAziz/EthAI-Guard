from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.v1 import routes as v1_routes

app = FastAPI(title="EthixAI Backend (stub)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(v1_routes.router)
