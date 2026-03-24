import logging

from fastapi import APIRouter, HTTPException

from .analyzer import analyze_floor_plan
from .config import settings
from .schemas import AnalyzeRequest, AnalyzeResponse, ErrorResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Floor Plan Analysis"])


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    responses={
        422: {"model": ErrorResponse, "description": "Not a floor plan or unprocessable image"},
        500: {"model": ErrorResponse, "description": "AI analysis failed"},
        503: {"model": ErrorResponse, "description": "Service not configured"},
    },
)
async def analyze(request: AnalyzeRequest):
    """Analyze a floor plan image and extract room information."""
    provider = settings.AI_PROVIDER.lower()

    if provider == "gemini" and not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Floor plan analysis is not configured. Set GEMINI_API_KEY or switch AI_PROVIDER to 'ollama'.",
        )

    if provider == "ollama" and not settings.OLLAMA_BASE_URL:
        raise HTTPException(
            status_code=503,
            detail="Ollama is not configured. Set OLLAMA_BASE_URL.",
        )

    try:
        analysis = await analyze_floor_plan(request.image_url)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        logger.error("Analysis parse error: %s", e)
        raise HTTPException(
            status_code=422,
            detail=f"Could not analyze the image: {e}. Please ensure it is a clear floor plan.",
        )
    except Exception as e:
        logger.exception("Floor plan analysis failed")
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {type(e).__name__}: {e}",
        )

    # Check if it's actually a floor plan
    if analysis.confidence == 0.0 and len(analysis.rooms) == 0:
        raise HTTPException(
            status_code=422,
            detail=analysis.notes or "The uploaded image does not appear to be a floor plan.",
        )

    return AnalyzeResponse(success=True, data=analysis)
