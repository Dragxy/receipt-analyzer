import base64
import json
import os
import httpx

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://arcturus:11434")
MODEL = os.getenv("OLLAMA_MODEL", "llama3.2-vision:11b")

EXTRACTION_PROMPT = """Analyze this receipt image and extract all information. Return ONLY valid JSON with this exact structure:
{
  "store": "store name or null",
  "date": "YYYY-MM-DD or null",
  "payment_method": "cash/card/contactless/debit/credit or null",
  "total": numeric value or null,
  "currency": "EUR or detected currency code",
  "items": [
    {
      "name": "item name",
      "price": numeric value or null,
      "amount": numeric quantity (default 1),
      "unit": "kg/L/piece/pack or null"
    }
  ]
}
Use null for any field you cannot determine. Always return valid JSON only."""


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
                "format": "json",
            },
        )
        response.raise_for_status()

    content = response.json()["message"]["content"]
    return json.loads(content)


async def health_check() -> bool:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{OLLAMA_URL}/api/tags")
            return r.status_code == 200
    except Exception:
        return False
