import base64
import json
import logging
import re

import httpx

from .config import settings
from .schemas import FloorPlanAnalysis

logger = logging.getLogger(__name__)

# ── Room & Item catalog (mirrors frontend constants) ──

ROOM_CATALOG = {
    "LIVING_ROOM": {
        "label": "Living Room",
        "items": ["tv_unit", "sofa_back_panel", "storage_display", "shoe_rack", "false_ceiling", "accent_wall", "cove_lighting"],
    },
    "DINING_AREA": {
        "label": "Dining Area",
        "items": ["crockery_unit", "bar_counter", "false_ceiling", "wall_panel"],
    },
    "KITCHEN": {
        "label": "Kitchen",
        "items": ["base_cabinet", "wall_cabinet", "tall_unit", "countertop", "backsplash", "breakfast_counter", "loft_storage"],
    },
    "UTILITY": {
        "label": "Utility",
        "items": ["utility_cabinet", "wall_shelf", "loft_storage"],
    },
    "MASTER_BEDROOM": {
        "label": "Master Bedroom",
        "items": ["wardrobe", "bed_back_panel", "dresser", "side_tables", "study_table", "false_ceiling", "tv_unit", "curtain_pelmet"],
    },
    "GUEST_BEDROOM": {
        "label": "Guest Bedroom",
        "items": ["wardrobe", "bed_back_panel", "study_table", "false_ceiling", "tv_unit"],
    },
    "KIDS_BEDROOM": {
        "label": "Kids Bedroom",
        "items": ["wardrobe", "study_table", "bed_back_panel", "bookshelf", "false_ceiling"],
    },
    "POOJA_ROOM": {
        "label": "Pooja Room",
        "items": ["pooja_unit", "wall_panel", "false_ceiling"],
    },
    "FOYER": {
        "label": "Foyer",
        "items": ["shoe_rack", "console_table", "wall_panel", "false_ceiling"],
    },
    "BALCONY": {
        "label": "Balcony",
        "items": ["storage_unit", "seating_ledge"],
    },
    "STUDY_ROOM": {
        "label": "Study Room",
        "items": ["study_table", "bookshelf", "storage_cabinet", "false_ceiling"],
    },
    "TV_UNIT_AREA": {
        "label": "TV Unit Area",
        "items": ["tv_unit", "back_panel", "storage_below"],
    },
    "BAR_UNIT": {
        "label": "Bar Unit",
        "items": ["bar_cabinet", "bar_counter", "wall_shelf"],
    },
    "SHOE_RACK_AREA": {
        "label": "Shoe Rack Area",
        "items": ["shoe_rack", "bench"],
    },
}

SCOPE_OPTIONS = [
    "Full Home Interior", "Kitchen", "Living Room", "Bedroom(s)",
    "Bathroom(s)", "False Ceiling", "Painting", "Electrical",
    "Flooring", "Furniture Only", "Modular Kitchen", "Wardrobe",
    "TV Unit", "Study Room", "Pooja Room",
]

SYSTEM_PROMPT = """You are an expert interior designer and floor plan analyst.
Analyze the uploaded floor plan image and extract structured information about the rooms,
dimensions, and layout. Return ONLY valid JSON matching the exact schema below.

IMPORTANT RULES:
1. Identify ALL visible rooms in the floor plan
2. Estimate dimensions in FEET based on proportions and any visible measurements
3. If dimensions are marked on the plan, use those exact values
4. Map each room to the closest matching key from this list:
   {room_keys}
5. For each room, suggest interior items from its available catalog:
   {room_items_catalog}
6. Determine BHK configuration by counting bedrooms
7. Estimate total carpet area (sum of all room areas, exclude walls)
8. Suggest appropriate scope of work from: {scope_options}
9. Suggest a package tier based on property size:
   - Under 800 sqft: BASIC
   - 800-1200 sqft: STANDARD
   - 1200-2000 sqft: PREMIUM
   - Over 2000 sqft: LUXURY
10. Set confidence between 0.0-1.0 based on image clarity and completeness

If the image is NOT a floor plan (e.g. a photo, document, random image), return:
{{
  "property_type": null,
  "bhk_config": null,
  "total_carpet_area_sqft": null,
  "rooms": [],
  "suggested_scope": [],
  "suggested_package": null,
  "confidence": 0.0,
  "notes": "The uploaded image does not appear to be a floor plan."
}}

RESPONSE SCHEMA (return ONLY this JSON, no markdown, no explanation):
{{
  "property_type": "APARTMENT" | "VILLA" | "INDEPENDENT_HOUSE" | "PENTHOUSE" | "STUDIO" | "OFFICE" | null,
  "bhk_config": "1 BHK" | "2 BHK" | "3 BHK" | "4 BHK" | null,
  "total_carpet_area_sqft": <number or null>,
  "rooms": [
    {{
      "name": "<human readable name>",
      "matched_key": "<KEY from list above or null>",
      "length_ft": <number or null>,
      "breadth_ft": <number or null>,
      "height_ft": 10.0,
      "area_sqft": <number or null>,
      "suggested_items": ["<item_key>", ...]
    }}
  ],
  "suggested_scope": ["<scope item>", ...],
  "suggested_package": "BASIC" | "STANDARD" | "PREMIUM" | "LUXURY" | null,
  "confidence": <0.0 to 1.0>,
  "notes": "<any observations or caveats>"
}}"""


def _build_prompt() -> str:
    room_keys = ", ".join(ROOM_CATALOG.keys())

    catalog_lines = []
    for key, info in ROOM_CATALOG.items():
        items_str = ", ".join(info["items"])
        catalog_lines.append(f"  {key} ({info['label']}): [{items_str}]")
    room_items_catalog = "\n".join(catalog_lines)

    scope_str = ", ".join(f'"{s}"' for s in SCOPE_OPTIONS)

    return SYSTEM_PROMPT.format(
        room_keys=room_keys,
        room_items_catalog=room_items_catalog,
        scope_options=scope_str,
    )


def _extract_json(text: str) -> dict:
    """Extract JSON from LLM response, handling markdown code blocks."""
    text = text.strip()
    if text.startswith("{"):
        return json.loads(text)

    match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if match:
        return json.loads(match.group(1).strip())

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        return json.loads(text[start : end + 1])

    raise ValueError("No valid JSON found in response")


async def fetch_image_bytes(image_url: str) -> tuple[bytes, str]:
    """Fetch image from the backend upload path or external URL."""
    if image_url.startswith("/"):
        full_url = f"{settings.BACKEND_URL}{image_url}"
    elif image_url.startswith("http"):
        full_url = image_url
    else:
        full_url = f"{settings.BACKEND_URL}/{image_url}"

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(full_url)
        response.raise_for_status()

    content_type = response.headers.get("content-type", "image/png")
    return response.content, content_type


def _resolve_mime(content_type: str) -> str:
    mime = content_type.split(";")[0].strip()
    if mime not in ("image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"):
        mime = "image/png"
    return mime


# ── Gemini Provider ──

async def _call_gemini(prompt: str, image_bytes: bytes, mime_type: str) -> str:
    """Call Google Gemini Vision API."""
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=[prompt, image_part],
        config=types.GenerateContentConfig(
            temperature=0.1,
            max_output_tokens=4096,
        ),
    )

    text = response.text
    if not text:
        raise ValueError("Empty response from Gemini")
    return text


async def _call_gemini_retry(prompt: str, image_bytes: bytes, mime_type: str) -> str:
    """Retry Gemini with stricter prompt."""
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=[
            f"The previous response was not valid JSON. Please analyze this floor plan "
            f"and return ONLY a raw JSON object (no markdown, no code blocks, no explanation). "
            f"Follow this exact schema:\n{prompt}",
            image_part,
        ],
        config=types.GenerateContentConfig(
            temperature=0.0,
            max_output_tokens=4096,
        ),
    )
    return response.text or ""


# ── Ollama Provider ──

async def _call_ollama(prompt: str, image_bytes: bytes, mime_type: str) -> str:
    """Call Ollama vision model (llava, bakllava, etc.)."""
    b64_image = base64.b64encode(image_bytes).decode("utf-8")

    payload = {
        "model": settings.OLLAMA_MODEL,
        "prompt": prompt,
        "images": [b64_image],
        "stream": False,
        "options": {
            "temperature": 0.1,
            "num_predict": 4096,
        },
    }

    async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT) as client:
        response = await client.post(
            f"{settings.OLLAMA_BASE_URL}/api/generate",
            json=payload,
        )
        response.raise_for_status()

    data = response.json()
    text = data.get("response", "")
    if not text:
        raise ValueError("Empty response from Ollama")
    return text


async def _call_ollama_retry(prompt: str, image_bytes: bytes, mime_type: str) -> str:
    """Retry Ollama with stricter prompt."""
    b64_image = base64.b64encode(image_bytes).decode("utf-8")

    payload = {
        "model": settings.OLLAMA_MODEL,
        "prompt": (
            f"The previous response was not valid JSON. Please analyze this floor plan "
            f"and return ONLY a raw JSON object (no markdown, no code blocks, no explanation). "
            f"Follow this exact schema:\n{prompt}"
        ),
        "images": [b64_image],
        "stream": False,
        "options": {
            "temperature": 0.0,
            "num_predict": 4096,
        },
    }

    async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT) as client:
        response = await client.post(
            f"{settings.OLLAMA_BASE_URL}/api/generate",
            json=payload,
        )
        response.raise_for_status()

    return response.json().get("response", "")


# ── Post-processing ──

def _postprocess(analysis: FloorPlanAnalysis) -> FloorPlanAnalysis:
    """Filter items, calculate areas, etc."""
    for room in analysis.rooms:
        if room.matched_key and room.matched_key in ROOM_CATALOG:
            valid_items = set(ROOM_CATALOG[room.matched_key]["items"])
            room.suggested_items = [i for i in room.suggested_items if i in valid_items]

        if room.length_ft and room.breadth_ft and not room.area_sqft:
            room.area_sqft = round(room.length_ft * room.breadth_ft, 1)

    if not analysis.total_carpet_area_sqft:
        room_areas = [r.area_sqft for r in analysis.rooms if r.area_sqft]
        if room_areas:
            analysis.total_carpet_area_sqft = round(sum(room_areas), 1)

    return analysis


# ── Main entry point ──

async def analyze_floor_plan(image_url: str) -> FloorPlanAnalysis:
    """Analyze a floor plan image using the configured AI provider."""
    provider = settings.AI_PROVIDER.lower()

    if provider == "gemini" and not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    if provider == "ollama":
        # Quick health check
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
        except Exception:
            raise RuntimeError(
                f"Ollama is not reachable at {settings.OLLAMA_BASE_URL}. "
                f"Make sure Ollama is running and the model '{settings.OLLAMA_MODEL}' is pulled."
            )

    # Fetch the image
    image_bytes, content_type = await fetch_image_bytes(image_url)
    mime_type = _resolve_mime(content_type)
    prompt = _build_prompt()

    # Select provider functions
    if provider == "ollama":
        call_fn = _call_ollama
        retry_fn = _call_ollama_retry
        provider_label = f"Ollama ({settings.OLLAMA_MODEL})"
    else:
        call_fn = _call_gemini
        retry_fn = _call_gemini_retry
        provider_label = f"Gemini ({settings.GEMINI_MODEL})"

    # Call AI
    logger.info("Calling %s for floor plan analysis", provider_label)
    response_text = await call_fn(prompt, image_bytes, mime_type)
    logger.info("%s response length: %d chars", provider_label, len(response_text))

    # Parse JSON
    try:
        data = _extract_json(response_text)
        logger.info("Parsed JSON successfully on first attempt")
    except (json.JSONDecodeError, ValueError) as e:
        logger.warning("First parse failed (%s), retrying via %s", e, provider_label)
        logger.debug("Raw response: %s", response_text[:2000])
        try:
            retry_text = await retry_fn(prompt, image_bytes, mime_type)
            data = _extract_json(retry_text)
            logger.info("Parsed JSON successfully on retry")
        except (json.JSONDecodeError, ValueError) as e2:
            logger.error("Retry parse also failed: %s", e2)
            logger.error("Raw retry response: %s", retry_text[:2000] if retry_text else "empty")
            raise ValueError(
                f"AI returned invalid JSON after 2 attempts. "
                f"This may happen with smaller models. Try a different model or Gemini."
            ) from e2

    # Validate & post-process
    try:
        analysis = FloorPlanAnalysis.model_validate(data)
    except Exception as e:
        logger.error("Pydantic validation failed: %s", e)
        logger.error("Parsed data keys: %s", list(data.keys()) if isinstance(data, dict) else type(data))
        raise ValueError(f"AI response didn't match expected format: {e}") from e

    return _postprocess(analysis)
