import os
import json
import httpx
from typing import List, Dict, Any, Optional
from ..config import settings

class ReplyGenerator:
    def __init__(self):
        pass

    def _generate_fallback_reply(
        self,
        tweet_text: str,
        author_handle: str,
        intent: str,
        sub_intent: str,
        tone: str,
        brand_name: str,
        brand_handle: str,
        historical_matches: List[Dict[str, Any]],
        entities: Dict[str, List[str]]
    ) -> str:
        """
        High-quality contextual fallback reply generator grounded in historical precedents
        and tailored to brand voice and 280-char Twitter constraints.
        """
        clean_handle = author_handle if author_handle.startswith("@") else f"@{author_handle}"
        
        # If we have a high-similarity historical precedent (> 0.65), adapt it
        if historical_matches and historical_matches[0].get("similarity_score", 0) > 0.65:
            past_reply = historical_matches[0]["agent_reply"]
            # Replace previous customer handles
            adapted = past_reply
            words = adapted.split()
            if words and words[0].startswith("@"):
                words[0] = clean_handle
                adapted = " ".join(words)
            else:
                adapted = f"{clean_handle} {adapted}"
            if len(adapted) <= 280:
                return adapted

        # Intent-specific contextual response templates
        if intent == "BILLING_REFUND":
            if "double" in sub_intent.lower() or "twice" in sub_intent.lower():
                reply = f"Hi {clean_handle}, so sorry about the double charge! Please DM us your account email and invoice ID so our billing team can instantly issue a full refund."
            else:
                reply = f"Hi {clean_handle}, we'd be glad to look into this billing issue right away. Please DM us your registered email address and we'll check your invoice status immediately."

        elif intent == "TECHNICAL_ISSUE":
            if "outage" in sub_intent.lower() or "500" in sub_intent.lower():
                reply = f"Hi {clean_handle}, our engineering team is actively investigating reports of service disruption. You can track real-time status updates at status.hiverhq.com or DM us for direct updates."
            else:
                reply = f"Hi {clean_handle}, sorry for the trouble with the app. Could you DM us your browser version and account email? We'll have an engineer inspect the logs right away."

        elif intent == "ACCOUNT_ACCESS":
            if "2fa" in sub_intent.lower() or "otp" in sub_intent.lower():
                reply = f"Hi {clean_handle}, let's get your authentication sorted. Please send us a DM with your account email so our security team can securely verify and reset your 2FA."
            else:
                reply = f"Hi {clean_handle}, we understand how frustrating login lockouts can be. Please DM us your account email and we'll send an expedited secure password reset link."

        elif intent == "ORDER_SHIPPING":
            reply = f"Hi {clean_handle}, we want to make sure you get your package! Please DM us your order number so we can track the courier dispatch and provide an immediate update."

        elif intent == "FEATURE_REQUEST":
            reply = f"Hi {clean_handle}, thank you so much for the fantastic feedback! We've passed this directly to our product design team. Keep the ideas coming!"

        elif intent == "CANCELLATION_CHURN":
            reply = f"Hi {clean_handle}, we're truly sorry to hear you're considering leaving. Please DM us your account details so we can help process your request or resolve any pain points you've experienced."

        elif intent == "ESCALATION_COMPLAINT":
            reply = f"Hi {clean_handle}, we sincerely apologize for your frustrating experience. This does not meet our standards. A senior support lead is ready to assist—please DM us your ticket/email directly."

        else: # GENERAL_INQUIRY
            reply = f"Hi {clean_handle}, thanks for reaching out to {brand_name}! You can check our complete guides at help.hiverhq.com or DM us anytime if you have any questions."

        # Tone Adjustments
        if "Professional" in tone:
            reply = reply.replace("so sorry", "we apologize").replace("fantastic", "valuable").replace("!", ".")
        elif "Casual" in tone:
            reply = reply.replace("sincerely apologize", "really sorry").replace("Hi ", "Hey ")

        # Ensure Twitter limit
        if len(reply) > 280:
            reply = reply[:277] + "..."

        return reply

    async def generate_reply(
        self,
        tweet_text: str,
        author_handle: str,
        intent: str,
        sub_intent: str,
        tone: str,
        brand_name: str,
        brand_handle: str,
        historical_matches: List[Dict[str, Any]],
        entities: Dict[str, List[str]]
    ) -> str:
        """
        Generates brand-aligned response using LLM (Gemini / OpenAI) if key configured,
        or deterministic intelligent RAG composition.
        """
        # If Gemini API Key configured, use Gemini 1.5/2.0
        if settings.GEMINI_API_KEY:
            try:
                prompt = f"""You are the official customer support AI agent for {brand_name} ({brand_handle}) on Twitter/X.
Generate a brand-consistent, concise, empathetic Twitter reply to the following customer tweet.

Customer Handle: {author_handle}
Tweet: "{tweet_text}"
Classified Intent: {intent} ({sub_intent})
Desired Tone: {tone}
Historical Reference Solutions:
{json.dumps([m.get('agent_reply') for m in historical_matches[:2]]) if historical_matches else 'None'}

Constraints:
1. Must be <= 280 characters.
2. Start with {author_handle} or 'Hi {author_handle}'.
3. Never invent fake phone numbers or non-existent URLs.
4. Direct the customer to DM if private details (email, order ID, payment) are needed.
5. Return ONLY the reply text."""

                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"maxOutputTokens": 100, "temperature": 0.4}
                }
                async with httpx.AsyncClient(timeout=6.0) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        text_res = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                        if len(text_res) <= 280:
                            return text_res
            except Exception:
                pass

        # Built-in robust RAG fallback
        return self._generate_fallback_reply(
            tweet_text=tweet_text,
            author_handle=author_handle,
            intent=intent,
            sub_intent=sub_intent,
            tone=tone,
            brand_name=brand_name,
            brand_handle=brand_handle,
            historical_matches=historical_matches,
            entities=entities
        )

reply_generator = ReplyGenerator()
