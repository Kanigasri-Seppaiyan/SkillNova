"""
routers/notifications.py — Notification retrieval and mark-as-read.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from database import get_db
from models.notification import Notification
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class NotificationOut(BaseModel):
    id: int
    type: str
    title: str
    body: str | None
    action_url: str | None
    is_read: bool
    created_at: str

    class Config:
        from_attributes = True


@router.get("/")
def get_notifications(
    limit: int = 20,
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        q = q.filter(Notification.is_read == False)
    notifications = q.order_by(Notification.created_at.desc()).limit(limit).all()

    unread_count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).count()

    return {
        "unread_count": unread_count,
        "notifications": [
            {
                "id": n.id,
                "user_id": n.user_id,
                "type": n.type,
                "title": n.title,
                "body": n.body,
                "message": n.body or n.title,
                "action_url": n.action_url,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in notifications
        ],
    }


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).count()
    return {"unread_count": count}


@router.post("/{notification_id}/read")
def mark_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"message": "Marked as read"}


@router.post("/read-all")
def mark_all_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}
