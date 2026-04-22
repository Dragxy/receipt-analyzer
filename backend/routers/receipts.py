from datetime import date as DateType
from typing import List, Optional

from dateutil import parser as dateutil_parser
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import desc
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from services.file_processor import save_upload, UPLOAD_DIR
from services.ollama import analyze_receipt

router = APIRouter(prefix="/api/receipts", tags=["receipts"])

ALLOWED_TYPES = {
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "image/tiff", "application/pdf",
}


@router.get("", response_model=List[schemas.ReceiptSummary])
def list_receipts(
    skip: int = 0,
    limit: int = 50,
    store: Optional[str] = None,
    date_from: Optional[DateType] = None,
    date_to: Optional[DateType] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.Receipt)
    if store:
        q = q.filter(models.Receipt.store.ilike(f"%{store}%"))
    if date_from:
        q = q.filter(models.Receipt.date >= date_from)
    if date_to:
        q = q.filter(models.Receipt.date <= date_to)

    receipts = q.order_by(
        desc(models.Receipt.date), desc(models.Receipt.created_at)
    ).offset(skip).limit(limit).all()

    return [
        schemas.ReceiptSummary(
            id=r.id,
            store=r.store,
            date=r.date,
            total=r.total,
            currency=r.currency,
            item_count=len(r.items),
            created_at=r.created_at,
        )
        for r in receipts
    ]


@router.get("/{receipt_id}", response_model=schemas.Receipt)
def get_receipt(receipt_id: int, db: Session = Depends(get_db)):
    receipt = db.query(models.Receipt).filter(models.Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return receipt


@router.post("", response_model=schemas.Receipt, status_code=201)
async def upload_receipt(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {file.content_type}")

    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 20 MB)")

    original_name, thumb_name = save_upload(content, file.filename or "upload")

    extracted: dict = {}
    analysis_error: Optional[str] = None
    try:
        extracted = await analyze_receipt(str(UPLOAD_DIR / thumb_name))
    except Exception as e:
        analysis_error = str(e)

    parsed_date = None
    date_str = extracted.get("date")
    if date_str and isinstance(date_str, str):
        try:
            parsed_date = dateutil_parser.parse(date_str).date()
        except (ValueError, OverflowError):
            pass

    receipt = models.Receipt(
        store=extracted.get("store"),
        date=parsed_date,
        payment_method=extracted.get("payment_method"),
        total=extracted.get("total"),
        currency=extracted.get("currency", "EUR"),
        notes=analysis_error,
        file_path=original_name,
        thumbnail_path=thumb_name,
    )
    db.add(receipt)
    db.flush()

    for item_data in extracted.get("items", []):
        item = models.Item(
            receipt_id=receipt.id,
            name=item_data.get("name", "Unknown item"),
            price=item_data.get("price"),
            amount=float(item_data.get("amount") or 1.0),
            unit=item_data.get("unit"),
        )
        db.add(item)

    db.commit()
    db.refresh(receipt)
    return receipt


@router.post("/{receipt_id}/reanalyze", response_model=schemas.Receipt)
async def reanalyze_receipt(receipt_id: int, db: Session = Depends(get_db)):
    receipt = db.query(models.Receipt).filter(models.Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    if not receipt.thumbnail_path:
        raise HTTPException(status_code=400, detail="No file available for reanalysis")

    try:
        extracted = await analyze_receipt(str(UPLOAD_DIR / receipt.thumbnail_path))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ollama error: {e}")

    parsed_date = None
    date_str = extracted.get("date")
    if date_str and isinstance(date_str, str):
        try:
            parsed_date = dateutil_parser.parse(date_str).date()
        except (ValueError, OverflowError):
            pass

    receipt.store = extracted.get("store", receipt.store)
    receipt.date = parsed_date or receipt.date
    receipt.payment_method = extracted.get("payment_method", receipt.payment_method)
    receipt.total = extracted.get("total", receipt.total)
    receipt.currency = extracted.get("currency", receipt.currency)
    receipt.notes = None

    for item in receipt.items:
        db.delete(item)
    for item_data in extracted.get("items", []):
        item = models.Item(
            receipt_id=receipt.id,
            name=item_data.get("name", "Unknown item"),
            price=item_data.get("price"),
            amount=float(item_data.get("amount") or 1.0),
            unit=item_data.get("unit"),
        )
        db.add(item)

    db.commit()
    db.refresh(receipt)
    return receipt


@router.put("/{receipt_id}", response_model=schemas.Receipt)
def update_receipt(receipt_id: int, data: schemas.ReceiptUpdate, db: Session = Depends(get_db)):
    receipt = db.query(models.Receipt).filter(models.Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")

    for field, value in data.model_dump(exclude={"items"}, exclude_none=True).items():
        setattr(receipt, field, value)

    if data.items is not None:
        for item in receipt.items:
            db.delete(item)
        for item_data in data.items:
            db.add(models.Item(receipt_id=receipt.id, **item_data.model_dump()))

    db.commit()
    db.refresh(receipt)
    return receipt


@router.delete("/{receipt_id}", status_code=204)
def delete_receipt(receipt_id: int, db: Session = Depends(get_db)):
    receipt = db.query(models.Receipt).filter(models.Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    db.delete(receipt)
    db.commit()
