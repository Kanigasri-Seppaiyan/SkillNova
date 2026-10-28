"""
routers/ai.py — AI Career Coach chat endpoint with conversation history.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from database import get_db
from models.ai import AIConversation, AIMessage
from models.user import User, StudentProfile
from services.auth_service import get_current_user, get_student_profile
from services.career_assistant_service import get_ai_response

router = APIRouter(prefix="/ai", tags=["AI Career Coach"])


class ChatMessage(BaseModel):
    content: Optional[str] = None
    message: Optional[str] = None
    conversation_id: Optional[int] = None
    language: Optional[str] = "en"

    @property
    def text(self) -> str:
        return (self.content or self.message or "").strip()


class MessageOut(BaseModel):
    id: int
    role: str
    content: str

    class Config:
        from_attributes = True


@router.get("/history")
def get_chat_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns the most recent chat history formatted for the frontend AIChat interface."""
    conv = db.query(AIConversation).filter(
        AIConversation.user_id == current_user.id
    ).order_by(AIConversation.updated_at.desc()).first()

    if not conv:
        return []

    return [
        {
            "id": str(m.id),
            "sender": "assistant" if m.role == "assistant" else "user",
            "content": m.content,
            "timestamp": m.created_at.strftime("%I:%M %p") if m.created_at else "Just now",
        }
        for m in conv.messages
    ]


@router.post("/chat")
def chat(
    payload: ChatMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile: StudentProfile = Depends(get_student_profile),
):
    text_content = payload.text
    if not text_content:
        raise HTTPException(status_code=400, detail="Message content is required")

    # Get or create conversation
    if payload.conversation_id:
        conversation = db.query(AIConversation).filter(
            AIConversation.id == payload.conversation_id,
            AIConversation.user_id == current_user.id,
        ).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conversation = AIConversation(
            user_id=current_user.id,
            language=payload.language or "en",
            title=text_content[:50] + "..." if len(text_content) > 50 else text_content,
        )
        db.add(conversation)
        db.flush()

    # Store user message
    user_msg = AIMessage(
        conversation_id=conversation.id,
        role="user",
        content=text_content,
    )
    db.add(user_msg)
    db.flush()

    # Build message history for context (last 10 turns)
    history = db.query(AIMessage).filter(
        AIMessage.conversation_id == conversation.id,
        AIMessage.role.in_(["user", "assistant"]),
    ).order_by(AIMessage.created_at.desc()).limit(20).all()
    history_for_ai = [{"role": m.role, "content": m.content} for m in reversed(history)]

    # Get AI response (grounded in student data)
    ai_text = get_ai_response(db, profile, history_for_ai, language=payload.language or "en")

    # Store assistant response
    assistant_msg = AIMessage(
        conversation_id=conversation.id,
        role="assistant",
        content=ai_text,
        meta_data={"grounded_on": ["skill_gaps", "roadmap", "placement_readiness"], "provider": "gemini"},
    )
    db.add(assistant_msg)
    db.commit()

    return {
        "conversation_id": conversation.id,
        "message": ai_text,
        "reply": ai_text,
        "message_id": assistant_msg.id,
    }


@router.get("/conversations")
def list_conversations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    convs = db.query(AIConversation).filter(
        AIConversation.user_id == current_user.id,
    ).order_by(AIConversation.updated_at.desc()).limit(20).all()

    return [{
        "id": c.id,
        "title": c.title,
        "language": c.language,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    } for c in convs]


@router.get("/conversations/{conversation_id}")
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = db.query(AIConversation).filter(
        AIConversation.id == conversation_id,
        AIConversation.user_id == current_user.id,
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return {
        "id": conv.id,
        "title": conv.title,
        "messages": [{"id": m.id, "role": m.role, "content": m.content} for m in conv.messages],
    }
