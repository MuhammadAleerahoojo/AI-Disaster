"""
Emergency safety chatbot.

Tries Groq's OpenAI-compatible chat completions endpoint first (if
GROQ_API_KEY is configured). If no key is set, or the request fails for any
reason, falls back to a deterministic rule-based emergency response engine
so the chatbot always works, even fully offline.
"""
import httpx

from app.core.config import settings

SYSTEM_PROMPT = (
    "You are a friendly, knowledgeable safety assistant embedded in a disaster-response platform. "
    "Talk naturally and conversationally, like a helpful person -- not like a legal disclaimer generator. "
    "For casual messages (greetings, small talk, thanks, etc.) just respond briefly and naturally, the way "
    "a person would; do not mention emergency services or disclaimers for these. "
    "When someone describes an actual hazard or emergency (flood, fire, earthquake, injury, being trapped, "
    "evacuation, preparedness), give SHORT, clear, actionable guidance -- numbered steps when helpful. "
    "Only when the situation described sounds genuinely urgent or life-threatening, add a brief reminder to "
    "contact local emergency services immediately -- and mention it once, naturally, not as a repeated stock "
    "phrase. Never claim you can dispatch help yourself.\n\n"
    "LANGUAGE RULE: If the user writes in English, reply in English. If the user writes in Urdu, Hindi, or "
    "Roman Urdu (Hindustani words spelled with English/Latin letters, e.g. 'aap kaisay hain'), always reply "
    "in ROMAN URDU using Latin script -- the same way the user wrote. Never reply using the Devanagari (Hindi) "
    "script, and never use Hindi-specific vocabulary choices -- use natural Pakistani Urdu wording transliterated "
    "into Latin letters instead. Match whichever language/script the user used in their most recent message."
)

RULES = [
    (["flood", "flooding", "water rising"],
     "Flood safety:\n1. Move to higher ground immediately, avoid walking/driving through moving water.\n"
     "2. Turn off electricity at the main switch if it's safe to reach.\n"
     "3. Avoid contact with flood water (contamination risk).\n"
     "4. Keep emergency supplies (water, food, flashlight) ready.\n"
     "If you are trapped or in immediate danger, contact local emergency services now."),
    (["fire", "wildfire", "smoke"],
     "Fire safety:\n1. Get low and go -- crawl under smoke to reduce inhalation.\n"
     "2. Feel doors before opening; if hot, use another exit.\n"
     "3. Call emergency services immediately if the fire is spreading.\n"
     "4. Never re-enter a burning building for belongings.\n"
     "If trapped, seal gaps under doors and signal for help from a window."),
    (["earthquake", "quake", "shaking"],
     "Earthquake safety:\n1. Drop, Cover, and Hold On -- get under sturdy furniture.\n"
     "2. Stay away from windows and heavy objects that could fall.\n"
     "3. If outdoors, move to an open area away from buildings and power lines.\n"
     "4. After shaking stops, check for injuries and gas leaks before using electrical switches.\n"
     "Expect aftershocks. Contact emergency services if anyone is injured or trapped."),
    (["trapped", "stuck", "can't move", "buried"],
     "If you are trapped:\n1. Try to call or text emergency services with your exact location.\n"
     "2. Tap on a pipe or wall in bursts of three to signal rescuers -- shouting wastes energy and air.\n"
     "3. Cover your nose/mouth with cloth to avoid dust inhalation.\n"
     "4. Avoid unnecessary movement that could cause debris to shift.\n"
     "Stay as calm as possible and conserve energy while waiting for rescue."),
    (["injury", "injured", "bleeding", "hurt", "wound"],
     "Basic injury response:\n1. Call emergency medical services for serious injuries.\n"
     "2. For bleeding, apply firm, direct pressure with a clean cloth.\n"
     "3. Do not move someone with a suspected spinal injury unless there's immediate danger.\n"
     "4. Keep the person warm and calm until help arrives."),
    (["evacuate", "evacuation"],
     "Evacuation guidance:\n1. Follow official evacuation routes/orders -- do not shortcut through risk zones.\n"
     "2. Take essential documents, medication, water, and a phone charger.\n"
     "3. Inform someone outside the area of your evacuation plan and destination.\n"
     "4. If driving, keep the fuel tank at least half full in high-risk seasons."),
    (["prepare", "preparedness", "kit", "plan"],
     "Emergency preparedness basics:\n1. Build a kit: water (3+ days), non-perishable food, flashlight, first aid, batteries.\n"
     "2. Agree on a family meeting point and out-of-area contact.\n"
     "3. Know your area's specific risks (flood zone, fault lines, wildfire risk).\n"
     "4. Keep copies of important documents in a waterproof bag."),
]

DEFAULT_FALLBACK = (
    "I can help with flood, fire, earthquake, injury, being trapped, evacuation, and "
    "preparedness guidance. Could you tell me a bit more about your situation? "
    "If this is a life-threatening emergency, please contact local emergency services immediately."
)

SUGGESTED_ACTIONS = [
    "What should I do during a flood?",
    "How do I stay safe in an earthquake?",
    "I'm trapped, what should I do?",
    "How do I prepare an emergency kit?",
]


# ---------- Urgency detection ----------
# Simple, transparent keyword-based severity scoring so the UI can surface a
# clear visual warning for messages that sound genuinely life-threatening.
# This is NOT a clinical/diagnostic assessment -- just a fast, always-available
# keyword signal that works even when the LLM path is unavailable.
CRITICAL_KEYWORDS = [
    "dying", "about to die", "going to die", "can't breathe", "cant breathe",
    "not breathing", "unconscious", "unresponsive", "no pulse", "not moving",
    "heavy bleeding", "bleeding a lot", "bleeding heavily", "severe bleeding",
    "collapsed", "chest pain", "heart attack", "electrocuted",
    "trapped", "buried", "trapped under", "can't move", "cant move",
    "can't get out", "cant get out", "child is trapped", "someone is trapped",
    "on fire", "house is on fire", "fire is spreading", "building collapsed",
    "drowning", "gas leak", "explosion",
]
HIGH_KEYWORDS = [
    "fire", "flood", "flooding", "earthquake", "injured", "injury", "bleeding",
    "hurt", "emergency", "help me", "urgent", "smoke", "stuck", "accident",
    "collapse", "evacuate now", "rising water",
]
MODERATE_KEYWORDS = [
    "evacuate", "warning", "damage", "crack", "unsafe", "shaking", "storm",
    "risk", "danger",
]


def detect_urgency(message: str) -> str:
    """Returns CRITICAL, HIGH, MODERATE, or LOW based on keyword signals.

    Intentionally simple and transparent rather than a black-box classifier --
    a fast, always-available safety net, not a diagnostic tool.
    """
    lower = message.lower()
    if any(k in lower for k in CRITICAL_KEYWORDS):
        return "CRITICAL"
    if any(k in lower for k in HIGH_KEYWORDS):
        return "HIGH"
    if any(k in lower for k in MODERATE_KEYWORDS):
        return "MODERATE"
    return "LOW"


def rule_based_reply(message: str) -> str:
    lower = message.lower()
    for keywords, response in RULES:
        if any(k in lower for k in keywords):
            return response
    return DEFAULT_FALLBACK


async def get_chat_reply(message: str, history: list[dict]) -> tuple[str, bool]:
    """Returns (reply, is_fallback)."""
    if not settings.GROQ_API_KEY:
        return rule_based_reply(message), True

    try:
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        messages.extend(history[-10:])
        messages.append({"role": "user", "content": message})

        async with httpx.AsyncClient(timeout=httpx.Timeout(15.0, connect=5.0)) as client:
            resp = await client.post(
                f"{settings.GROQ_BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                json={
                    "model": settings.GROQ_MODEL,
                    "messages": messages,
                    "temperature": 0.4,
                    "max_tokens": 500,
                },
            )
            resp.raise_for_status()
            data = resp.json()
        reply = data["choices"][0]["message"]["content"]
        return reply, False
    except Exception:
        return rule_based_reply(message), True