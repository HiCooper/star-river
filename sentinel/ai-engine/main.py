import os
from fastapi import FastAPI
from triage.models import TriageRequest, TriageResponse
from triage.classifier import classify_errors

app = FastAPI(title="Sentinel AI Engine", version="0.1.0")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "sentinel-ai-engine"}


@app.post("/api/v1/triage", response_model=TriageResponse)
async def triage(req: TriageRequest):
    results = await classify_errors(req.errors)
    return TriageResponse(results=results)


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8083"))
    uvicorn.run(app, host="0.0.0.0", port=port)
