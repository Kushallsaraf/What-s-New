from fastapi import APIRouter

from whats_new.evaluation import full_evaluation_report

router = APIRouter()


@router.get("/evaluation")
def evaluation() -> dict:
    return full_evaluation_report()
