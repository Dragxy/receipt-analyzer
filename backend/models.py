from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from database import Base


class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(Integer, primary_key=True, index=True)
    store = Column(String, nullable=True)
    date = Column(Date, nullable=True)
    payment_method = Column(String, nullable=True)
    total = Column(Float, nullable=True)
    currency = Column(String, default="EUR")
    notes = Column(Text, nullable=True)
    needs_review = Column(Boolean, default=False, nullable=False)
    file_path = Column(String, nullable=True)      # original upload (uuid.ext)
    thumbnail_path = Column(String, nullable=True)  # analysis image (uuid.jpg)
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("Item", back_populates="receipt", cascade="all, delete-orphan")


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    receipt_id = Column(Integer, ForeignKey("receipts.id"), nullable=False)
    name = Column(String, nullable=False)
    price = Column(Float, nullable=True)
    amount = Column(Float, default=1.0)
    unit = Column(String, nullable=True)

    receipt = relationship("Receipt", back_populates="items")
