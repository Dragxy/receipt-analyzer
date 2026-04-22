from datetime import date as DateType, datetime
from typing import Optional, List
from pydantic import BaseModel


class ItemBase(BaseModel):
    name: str
    price: Optional[float] = None
    amount: float = 1.0
    unit: Optional[str] = None


class ItemCreate(ItemBase):
    pass


class Item(ItemBase):
    id: int
    receipt_id: int

    model_config = {"from_attributes": True}


class ReceiptBase(BaseModel):
    store: Optional[str] = None
    date: Optional[DateType] = None
    payment_method: Optional[str] = None
    total: Optional[float] = None
    currency: str = "EUR"
    notes: Optional[str] = None
    needs_review: bool = False


class ReceiptCreate(ReceiptBase):
    items: List[ItemCreate] = []


class ReceiptUpdate(ReceiptBase):
    items: Optional[List[ItemCreate]] = None


class Receipt(ReceiptBase):
    id: int
    file_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    created_at: datetime
    items: List[Item] = []

    model_config = {"from_attributes": True}


class ReceiptSummary(BaseModel):
    id: int
    store: Optional[str]
    date: Optional[DateType]
    total: Optional[float]
    currency: str
    item_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class MonthlyStats(BaseModel):
    year: int
    month: int
    total: float
    receipt_count: int
    avg_per_receipt: float


class StoreStats(BaseModel):
    store: str
    total: float
    visit_count: int


class DashboardStats(BaseModel):
    total_receipts: int
    total_spent: float
    avg_per_receipt: float
    monthly: List[MonthlyStats]
    by_store: List[StoreStats]
