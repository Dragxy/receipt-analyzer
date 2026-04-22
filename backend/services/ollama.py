import base64
import json
import os
import re
import httpx

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://arcturus:11434")
MODEL = os.getenv("OLLAMA_MODEL", "llama3.2-vision:11b")

EXTRACTION_PROMPT = """You are a receipt scanner. Analyze this receipt image carefully.
Extract all information and respond with ONLY a JSON object, no other text.

JSON structure:
{
  "store": "store name or null",
  "date": "YYYY-MM-DD or null",
  "payment_method": "cash or card or contactless or null",
  "total": 12.99,
  "currency": "EUR",
  "items": [
    {"name": "item name", "price": 1.99, "amount": 1, "unit": null}
  ]
}

Rules:
- total and price must be numbers, not strings
- date must be YYYY-MM-DD format
- use null for unknown fields
- items array must list every individual product on the receipt"""


def _extract_json(text: str) -> dict:
    """Parse JSON from model output, handles markdown code blocks."""
    text = text.strip()

    # Direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Strip markdown code block: ```json ... ``` or ``` ... ```
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # Find first { ... } block in the text
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    raise ValueError(f"No valid JSON in model response. Raw output: {text[:300]}")


async def analyze_receipt(image_path: str) -> dict:
    with open(image_path, "rb") as f:
        image_b64 = base64.b64encode(f.read()).decode("utf-8")

    async with httpx.AsyncClient(timeout=180.0) as client:
        response = await client.post(
            f"{OLLAMA_URL}/api/chat",
            json={
                "model": MODEL,
                "messages": [
                    {
                        "role": "user",
                        "content": EXTRACTION_PROMPT,
                        "images": [image_b64],
                    }
                ],
                "stream": False,
                # No "format": "json" — it causes llama3.2-vision to produce
                # minimal or malformed output; we extract JSON manually instead.
            },
        )
        response.raise_for_status()

    content = response.json()["message"]["content"]
    return _extract_json(content)


async def health_check() -> bool:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{OLLAMA_URL}/api/tags")
            return r.status_code == 200
    except Exception:
        return False
