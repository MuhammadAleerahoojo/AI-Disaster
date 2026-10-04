from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import ChatSession, ChatMessage, User
from app.schemas.schemas import ChatRequest, ChatResponse
from app.services.chatbot import get_chat_reply, detect_urgency, SUGGESTED_ACTIONS
from app.api.deps import get_optional_user

router = APIRouter(prefix="/api/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
async def chat(payload: ChatRequest, db: Session = Depends(get_db), current_user: User | None = Depends(get_optional_user)):
    if payload.session_id:
        session = db.query(ChatSession).filter(ChatSession.id == payload.session_id).first()
    else:
        session = None

    if not session:
        session = ChatSession(user_id=current_user.id if current_user else None)
        db.add(session)
        db.commit()
        db.refresh(session)

    history_records = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    history = [{"role": m.role, "content": m.content} for m in history_records]

    user_msg = ChatMessage(session_id=session.id, role="user", content=payload.message)
    db.add(user_msg)
    db.commit()

    reply, is_fallback = await get_chat_reply(payload.message, history)
    urgency = detect_urgency(payload.message)

    assistant_msg = ChatMessage(session_id=session.id, role="assistant", content=reply)
    db.add(assistant_msg)
    db.commit()

    return ChatResponse(
        session_id=session.id,
        reply=reply,
        is_fallback=is_fallback,
        urgency=urgency,
        suggested_actions=SUGGESTED_ACTIONS,
    )