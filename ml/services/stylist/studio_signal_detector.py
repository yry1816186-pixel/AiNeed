"""
Studio Signal Detector

Detects conversation signals that should trigger a studio recommendation.
Signals: premium_budget, luxury_budget, unique_request, special_event, multiple_rejections.
"""

import logging
from typing import Optional

from ml.services.stylist.dialog_state import DialogContext

logger = logging.getLogger(__name__)


class StudioSignalDetector:
    """Detect conversation signals that trigger studio recommendation.

    Signals are checked in priority order:
    1. Budget signals (from slots): luxury_budget > premium_budget
    2. Rejection count (from context): multiple_rejections
    3. Message-based signals: unique_request, special_event
    """

    SIGNAL_PATTERNS = {
        "premium_budget": lambda slots: (slots.get("budget", {}) or {}).get("min", 0) >= 3000,
        "luxury_budget": lambda slots: (slots.get("budget", {}) or {}).get("min", 0) >= 5000,
        "unique_request": lambda msg: any(
            kw in msg for kw in ["独一无二", "定制", "特别定制", "bespoke"]
        ),
        "special_event": lambda msg: any(
            kw in msg for kw in ["婚礼", "红毯", "颁奖典礼", "重要场合", "婚礼伴娘"]
        ),
    }

    RECOMMENDATION_MESSAGES = {
        "premium_budget": "你的预算挺充裕的，其实可以考虑工作室定制，能更贴合你的想法。",
        "luxury_budget": "这个预算的话，我认识几家工作室，做出的效果会比网购好很多。",
        "multiple_rejections": "看来线上挑不到完全满意的？要不试试工作室定制？",
        "unique_request": "你想要独一无二的效果，这个找工作室定制会更好实现。",
        "special_event": "这种重要场合，工作室的造型师可以给你做整体造型，比单挑衣服更靠谱。",
    }

    def detect(self, message: str, context: DialogContext) -> Optional[str]:
        """Returns signal type if triggered, None otherwise.

        Args:
            message: The user's current message.
            context: The current dialog context with slots and feedback history.

        Returns:
            Signal name string or None.
        """
        # Check budget signals from slots (highest priority)
        slots = context.slots.model_dump() if hasattr(context.slots, "model_dump") else {}
        # Check luxury first (higher threshold)
        if self.SIGNAL_PATTERNS["luxury_budget"](slots):
            return "luxury_budget"
        if self.SIGNAL_PATTERNS["premium_budget"](slots):
            return "premium_budget"

        # Check rejection count
        if getattr(context, "negative_feedback_count", 0) >= 3:
            return "multiple_rejections"

        # Check message-based signals
        for signal_name in ["unique_request", "special_event"]:
            if self.SIGNAL_PATTERNS[signal_name](message):
                return signal_name

        return None

    def get_recommendation_message(self, signal: str) -> str:
        """Get the Yiyi-style recommendation message for a detected signal."""
        return self.RECOMMENDATION_MESSAGES.get(
            signal, "要不要看看工作室推荐？"
        )
