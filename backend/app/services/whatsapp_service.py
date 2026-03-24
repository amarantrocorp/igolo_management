"""
WhatsApp Business Cloud API integration.
Uses Meta's Graph API to send template messages and notifications.
"""

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_whatsapp_message(
    phone: str,
    template_name: str,
    template_params: list[str],
    language: str = "en",
) -> bool:
    """Send a WhatsApp template message via Meta Cloud API."""
    if not settings.WHATSAPP_ENABLED or not settings.WHATSAPP_ACCESS_TOKEN:
        logger.info("WhatsApp not configured, skipping message to %s", phone)
        return False

    # Normalize phone number (add country code if missing)
    phone = normalize_phone(phone)

    url = f"{settings.WHATSAPP_API_URL}/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }

    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": language},
            "components": (
                [
                    {
                        "type": "body",
                        "parameters": [
                            {"type": "text", "text": p} for p in template_params
                        ],
                    }
                ]
                if template_params
                else []
            ),
        },
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            logger.info(
                "WhatsApp message sent to %s (template: %s)", phone, template_name
            )
            return True
    except Exception as e:
        logger.error("WhatsApp send failed to %s: %s", phone, e)
        return False


def normalize_phone(phone: str) -> str:
    """Normalize phone to international format (91XXXXXXXXXX for India)."""
    digits = "".join(c for c in phone if c.isdigit())
    if len(digits) == 10:
        return f"91{digits}"
    if digits.startswith("91") and len(digits) == 12:
        return digits
    if digits.startswith("+"):
        return digits[1:]
    return digits


# ---------------------------------------------------------------------------
# Convenience functions for common notifications
# ---------------------------------------------------------------------------


async def notify_lead_assigned(phone: str, lead_name: str, assigned_to: str) -> bool:
    """Notify a sales person that a new lead has been assigned to them."""
    return await send_whatsapp_message(phone, "lead_assigned", [lead_name, assigned_to])


async def notify_quote_sent(
    phone: str, client_name: str, quote_amount: str, quote_link: str
) -> bool:
    """Notify a client that their quotation is ready."""
    return await send_whatsapp_message(
        phone, "quote_sent", [client_name, quote_amount, quote_link]
    )


async def notify_payment_received(
    phone: str, client_name: str, amount: str, project_name: str
) -> bool:
    """Notify a client that their payment has been received."""
    return await send_whatsapp_message(
        phone, "payment_received", [client_name, amount, project_name]
    )


async def notify_sprint_update(
    phone: str, client_name: str, sprint_name: str, status: str
) -> bool:
    """Notify a client about a sprint status change."""
    return await send_whatsapp_message(
        phone, "sprint_update", [client_name, sprint_name, status]
    )


async def notify_project_handover(
    phone: str, client_name: str, project_name: str
) -> bool:
    """Notify a client that their project is ready for handover."""
    return await send_whatsapp_message(
        phone, "project_handover", [client_name, project_name]
    )
