from fastapi import APIRouter

router = APIRouter(prefix="/ai_core")


@router.get("/reports/{report_id}")
def get_report(report_id: str):
    # Return a mock report
    return {
        "report_id": report_id,
        "status": "available",
        "summary": {"demographic_parity": 0.95},
    }
