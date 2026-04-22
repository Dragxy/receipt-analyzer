import base64
import json
import os
import re
import httpx

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://arcturus:11434")
MODEL = os.getenv("OLLAMA_MODEL", "llama3.2-vision:11b")

SYSTEM_PROMPT = (
    "You are a receipt data extraction API. "
    "You ONLY output valid JSON. No markdown, no explanations, no bullet points. "
    "Just a single JSON object and nothing else."
)

EXTRACTION_PROMPT = """Extract all data from this receipt image and return a single JSON object.

Required format:
{
  "store": "store name or null",
  "date": "YYYY-MM-DD or null",
  "payment_method": "cash or card or contactless or null",
  "total": 12.99,
  "currency": "EUR",
  "items": [
    {"name": "product name", "price": 1.99, "amount": 1, "unit": null}
  ]
}

Rules:
- total and price are numbers, never strings
- date is YYYY-MM-DD (convert from any format)
- list every individual PRODUCT on the receipt
- DO NOT include discounts, rebates, coupons, vouchers, or loyalty points as items — they are already reflected in the total
- On German/Austrian receipts (Lidl, Billa, Spar, Hofer, etc.), discount lines such as "Lidl Plus Rabatt", "RABATT X%", "Preisvorteil", "Gutschein", "Bon" appear as SEPARATE LINES directly after the product they apply to — these are NOT products, skip them entirely
- Never merge a discount/rebate line with the name of the following product line
- use null for unknown fields
- output ONLY the JSON object, nothing else"""


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
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": EXTRACTION_PROMPT,
                        "images": [image_b64],
                    },
                ],
                "stream": False,
                "format": "json",
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
