import os
from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..services.golden_set import golden_set_service

router = APIRouter(prefix="/golden-set", tags=["Golden Set Annotation"])


class AnnotateRequest(BaseModel):
    conversation_id: str = Field(..., description="The unique conversation ID to annotate")
    true_intent: str = Field(..., description="The verified ground-truth intent label chosen from the 8 intents")


@router.get("/items")
def get_golden_set_items(db: Session = Depends(get_db)):
    """
    Returns the 200 randomly sampled conversations for golden set annotation,
    including completion progress (e.g. 37/200), available intents, and items list.
    """
    try:
        data = golden_set_service.get_golden_set_status(db=db)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load golden set items: {str(e)}")


@router.post("/annotate")
def save_golden_set_annotation(payload: AnnotateRequest, db: Session = Depends(get_db)):
    """
    Saves the user's selected ground-truth intent into conversations.true_intent.
    """
    try:
        result = golden_set_service.save_annotation(
            db=db,
            conversation_id=payload.conversation_id,
            true_intent=payload.true_intent
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save annotation: {str(e)}")


@router.post("/resample")
def resample_golden_set(db: Session = Depends(get_db)):
    """
    Resamples 200 random conversations from the Spotify dataset for golden set annotation.
    """
    try:
        golden_set_service.get_or_create_samples(db=db, sample_size=200, resample=True)
        return golden_set_service.get_golden_set_status(db=db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to resample golden set: {str(e)}")


@router.get("/export-csv")
def download_golden_set_csv(db: Session = Depends(get_db)):
    """
    Exports and downloads the 200-sample golden set as golden_set.csv.
    """
    try:
        csv_path = golden_set_service.export_golden_set_csv(db=db)
        if not os.path.exists(csv_path):
            raise HTTPException(status_code=404, detail="golden_set.csv could not be generated.")

        return FileResponse(
            path=csv_path,
            filename="golden_set.csv",
            media_type="text/csv"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export golden_set.csv: {str(e)}")
