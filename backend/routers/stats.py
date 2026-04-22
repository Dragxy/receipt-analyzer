from fastapi import APIRouter, Depends
from sqlalchemy import func, extract
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/dashboard", response_model=schemas.DashboardStats)
def get_dashboard(db: Session = Depends(get_db)):
    total_receipts = db.query(func.count(models.Receipt.id)).scalar() or 0
    total_spent = db.query(func.sum(models.Receipt.total)).scalar() or 0.0
    avg = total_spent / total_receipts if total_receipts > 0 else 0.0

    monthly_raw = (
        db.query(
            extract("year", models.Receipt.date).label("year"),
            extract("month", models.Receipt.date).label("month"),
            func.sum(models.Receipt.total).label("total"),
            func.count(models.Receipt.id).label("count"),
        )
        .filter(models.Receipt.date.isnot(None))
        .group_by("year", "month")
        .order_by("year", "month")
        .all()
    )

    monthly = [
        schemas.MonthlyStats(
            year=int(r.year),
            month=int(r.month),
            total=round(r.total or 0.0, 2),
            receipt_count=r.count,
            avg_per_receipt=round((r.total or 0.0) / r.count, 2) if r.count > 0 else 0.0,
        )
        for r in monthly_raw
    ]

    store_raw = (
        db.query(
            models.Receipt.store,
            func.sum(models.Receipt.total).label("total"),
            func.count(models.Receipt.id).label("count"),
        )
        .filter(models.Receipt.store.isnot(None), models.Receipt.total.isnot(None))
        .group_by(models.Receipt.store)
        .order_by(func.sum(models.Receipt.total).desc())
        .limit(10)
        .all()
    )

    by_store = [
        schemas.StoreStats(store=r.store, total=round(r.total or 0.0, 2), visit_count=r.count)
        for r in store_raw
    ]

    return schemas.DashboardStats(
        total_receipts=total_receipts,
        total_spent=round(total_spent, 2),
        avg_per_receipt=round(avg, 2),
        monthly=monthly,
        by_store=by_store,
    )
