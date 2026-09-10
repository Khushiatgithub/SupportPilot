import os
from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..services.llm_judge import spotify_llm_judge_service

router = APIRouter(prefix="/llm-judge", tags=["LLM-as-Judge Evaluation"])


class HumanScoreRequest(BaseModel):
    sample_order: int = Field(..., description="Sample order number (1 to 30)")
    correctness: int = Field(..., ge=1, le=5, description="Correctness score (1-5)")
    groundedness: int = Field(..., ge=1, le=5, description="Groundedness score (1-5)")
    empathy: int = Field(..., ge=1, le=5, description="Empathy score (1-5)")
    actionability: int = Field(..., ge=1, le=5, description="Actionability score (1-5)")
    hallucination: str = Field(..., description="Hallucination check ('PASS' or 'FAIL')")
    notes: Optional[str] = Field("", description="Optional human evaluator notes")


@router.get("/samples")
def get_judge_samples(db: Session = Depends(get_db)):
    """
    Returns 30 sampled generated replies, LLM judge rubric evaluations,
    human evaluator scores, and live inter-rater agreement metrics.
    """
    try:
        data = spotify_llm_judge_service.get_status_and_samples(db=db)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load judge samples: {str(e)}")


@router.post("/human-score")
def submit_human_score(payload: HumanScoreRequest, db: Session = Depends(get_db)):
    """
    Saves the human evaluator's scores for a sample and updates agreement metrics.
    """
    try:
        result = spotify_llm_judge_service.save_human_evaluation(
            db=db,
            sample_order=payload.sample_order,
            correctness=payload.correctness,
            groundedness=payload.groundedness,
            empathy=payload.empathy,
            actionability=payload.actionability,
            hallucination=payload.hallucination,
            notes=payload.notes
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save human score: {str(e)}")


@router.post("/resample")
def resample_judge_evaluations(db: Session = Depends(get_db)):
    """
    Resamples 30 generated replies and re-evaluates LLM judge scores.
    """
    try:
        spotify_llm_judge_service.get_or_create_evaluation_samples(db=db, resample=True)
        return spotify_llm_judge_service.get_status_and_samples(db=db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to resample evaluations: {str(e)}")


@router.get("/metrics")
def get_agreement_metrics(db: Session = Depends(get_db)):
    """
    Returns computed Cohen's Kappa, percentage agreement, and mean absolute score difference.
    """
    try:
        status = spotify_llm_judge_service.get_status_and_samples(db=db)
        return status["metrics"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate metrics: {str(e)}")


@router.get("/export-csv")
def download_judge_csv(db: Session = Depends(get_db)):
    """
    Exports and downloads judge_agreement.csv.
    """
    try:
        csv_path, _ = spotify_llm_judge_service.export_judge_artifacts(db=db)
        if not os.path.exists(csv_path):
            raise HTTPException(status_code=404, detail="judge_agreement.csv could not be generated.")

        return FileResponse(
            path=csv_path,
            filename="judge_agreement.csv",
            media_type="text/csv"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export CSV: {str(e)}")


@router.get("/export-json")
def download_judge_json(db: Session = Depends(get_db)):
    """
    Exports and downloads llm_judge_results.json.
    """
    try:
        _, json_path = spotify_llm_judge_service.export_judge_artifacts(db=db)
        if not os.path.exists(json_path):
            raise HTTPException(status_code=404, detail="llm_judge_results.json could not be generated.")

        return FileResponse(
            path=json_path,
            filename="llm_judge_results.json",
            media_type="application/json"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export JSON: {str(e)}")
