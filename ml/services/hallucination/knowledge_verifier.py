"""
Knowledge Base Verifier for Hallucination Detection

Uses RAG system to verify LLM outputs against established fashion knowledge.
Retrieves relevant knowledge and compares with generated content.

2026 AI Safety Best Practices Implementation
"""

import re
import logging
import time
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field

from .detector import HallucinationIssue, HallucinationType
from .fashion_rules import RuleSeverity

logger = logging.getLogger(__name__)


@dataclass
class VerificationResult:
    """Result of knowledge verification"""
    is_verified: bool
    confidence: float
    matched_rules: List[Dict[str, Any]]
    mismatches: List[Dict[str, Any]]
    sources: List[str]


class KnowledgeVerifier:
    """
    Knowledge Base Verifier

    Verifies LLM outputs against fashion knowledge base using RAG retrieval.
    """

    def __init__(
        self,
        rag_service: Optional[Any] = None,
        similarity_threshold: float = 0.7
    ):
        """
        Initialize Knowledge Verifier

        Args:
            rag_service: FashionKnowledgeRAG service instance
            similarity_threshold: Threshold for considering content similar
        """
        self.rag_service = rag_service
        self.similarity_threshold = similarity_threshold

        # Knowledge categories to verify against
        self.verify_categories = [
            'body_type',
            'color_season',
            'occasion',
            'garment',
            'style'
        ]

        # Pre-defined fact checks
        self._init_fact_checks()

    def _init_fact_checks(self):
        """Initialize pre-defined fact verification rules"""
        # Color season rules
        self.color_season_facts = {
            'spring': {
                'best_colors': ['coral', 'peach', 'light_green', 'cream', 'warm_colors'],
                'avoid_colors': ['black', 'white', 'cool_colors']
            },
            'summer': {
                'best_colors': ['pastel', 'rose', 'lavender', 'soft_blue', 'cool_colors'],
                'avoid_colors': ['orange', 'bright_warm_colors']
            },
            'autumn': {
                'best_colors': ['rust', 'olive', 'mustard', 'brown', 'warm_earth_tones'],
                'avoid_colors': ['pastel', 'cool_bright_colors']
            },
            'winter': {
                'best_colors': ['black', 'white', 'red', 'royal_blue', 'clear_bright_colors'],
                'avoid_colors': ['muted_colors', 'orange', 'gold']
            }
        }

        # Body type recommendations
        self.body_type_facts = {
            'hourglass': {
                'recommend': ['fitted', 'waist_definition', 'wrap_dresses'],
                'avoid': ['boxy', 'shapeless', 'oversized']
            },
            'pear': {
                'recommend': ['a_line', 'boat_neck', 'add_upper_volume'],
                'avoid': ['tight_bottoms', 'hip_details']
            },
            'apple': {
                'recommend': ['empire_waist', 'v_neck', 'show_legs'],
                'avoid': ['tight_waist', 'crop_tops', 'clinging']
            },
            'rectangle': {
                'recommend': ['peplum', 'ruched', 'layered', 'belted'],
                'avoid': ['shapeless', 'straight_cut']
            },
            'inverted_triangle': {
                'recommend': ['wide_leg', 'a_line', 'v_neck'],
                'avoid': ['shoulder_pads', 'boat_neck']
            }
        }

        # Occasion rules
        self.occasion_facts = {
            'business': {
                'required': ['professional', 'polished'],
                'forbidden': ['shorts', 'flip_flops', 'tank_tops', 'ripped_jeans']
            },
            'formal': {
                'required': ['elegant', 'refined'],
                'forbidden': ['jeans', 'sneakers', 't_shirts']
            },
            'wedding_guest': {
                'required': ['dressy', 'appropriate'],
                'forbidden': ['white', 'overly_casual']
            },
            'interview': {
                'required': ['professional', 'conservative'],
                'forbidden': ['casual', 'revealing', 'flashy']
            }
        }

        # Season clothing rules
        self.season_facts = {
            'spring': {
                'recommend': ['light_layers', 'cardigan', 'light_jacket'],
                'avoid': ['heavy_coat', 'thick_sweater']
            },
            'summer': {
                'recommend': ['breathable', 'lightweight', 'linen', 'cotton'],
                'avoid': ['wool', 'heavy_fabrics', 'dark_colors']
            },
            'autumn': {
                'recommend': ['layers', 'light_coat', 'boots', 'sweater'],
                'avoid': ['flip_flops', 'shorts', 'tank_tops']
            },
            'winter': {
                'recommend': ['heavy_coat', 'sweater', 'boots', 'layers'],
                'avoid': ['sandals', 'shorts', 'light_dresses']
            }
        }

        # ==========================================
        # GARMENT ATTRIBUTE VERIFICATION RULES
        # ==========================================
        # Fabric properties and characteristics
        self.fabric_properties = {
            'cotton': {
                'breathable': True, 'wrinkle_prone': True, 'seasons': ['spring', 'summer', 'autumn'],
                'care': ['machine_wash', 'iron'], 'formal': False, 'stretch': False
            },
            'linen': {
                'breathable': True, 'wrinkle_prone': True, 'seasons': ['summer'],
                'care': ['hand_wash', 'dry_clean'], 'formal': False, 'stretch': False
            },
            'wool': {
                'breathable': False, 'wrinkle_prone': False, 'seasons': ['autumn', 'winter'],
                'care': ['dry_clean', 'hand_wash'], 'formal': True, 'stretch': True
            },
            'silk': {
                'breathable': True, 'wrinkle_prone': True, 'seasons': ['spring', 'summer', 'autumn'],
                'care': ['dry_clean', 'hand_wash'], 'formal': True, 'stretch': False
            },
            'polyester': {
                'breathable': False, 'wrinkle_prone': False, 'seasons': ['all'],
                'care': ['machine_wash'], 'formal': False, 'stretch': True
            },
            'cashmere': {
                'breathable': True, 'wrinkle_prone': False, 'seasons': ['autumn', 'winter'],
                'care': ['dry_clean', 'hand_wash'], 'formal': True, 'stretch': True
            },
            'denim': {
                'breathable': True, 'wrinkle_prone': False, 'seasons': ['spring', 'summer', 'autumn'],
                'care': ['machine_wash'], 'formal': False, 'stretch': True
            },
            'leather': {
                'breathable': False, 'wrinkle_prone': False, 'seasons': ['autumn', 'winter'],
                'care': ['specialist_cleaning'], 'formal': True, 'stretch': True
            },
        }

        # Garment category attributes
        self.garment_categories = {
            't_shirt': {'formality': 'casual', 'layer': 'base', 'gender': 'unisex'},
            'dress_shirt': {'formality': 'formal', 'layer': 'base', 'gender': 'unisex'},
            'blouse': {'formality': 'smart_casual', 'layer': 'base', 'gender': 'female'},
            'sweater': {'formality': 'smart_casual', 'layer': 'mid', 'gender': 'unisex'},
            'blazer': {'formality': 'formal', 'layer': 'outer', 'gender': 'unisex'},
            'jeans': {'formality': 'casual', 'layer': 'bottom', 'gender': 'unisex'},
            'dress_pants': {'formality': 'formal', 'layer': 'bottom', 'gender': 'unisex'},
            'skirt': {'formality': 'varies', 'layer': 'bottom', 'gender': 'female'},
            'dress': {'formality': 'varies', 'layer': 'one_piece', 'gender': 'female'},
            'shorts': {'formality': 'casual', 'layer': 'bottom', 'gender': 'unisex'},
            'coat': {'formality': 'varies', 'layer': 'outer', 'gender': 'unisex'},
            'jacket': {'formality': 'varies', 'layer': 'outer', 'gender': 'unisex'},
        }

        # Style definitions
        self.style_definitions = {
            'casual': {'keywords': ['relaxed', 'comfortable', 'everyday'], 'formality': 1},
            'smart_casual': {'keywords': ['polished', 'relaxed', 'versatile'], 'formality': 2},
            'business': {'keywords': ['professional', 'polished', 'conservative'], 'formality': 3},
            'formal': {'keywords': ['elegant', 'sophisticated', 'dressy'], 'formality': 4},
            'black_tie': {'keywords': ['glamorous', 'evening', 'sophisticated'], 'formality': 5},
            'streetwear': {'keywords': ['urban', 'trendy', 'edgy'], 'formality': 1},
            'bohemian': {'keywords': ['free_spirited', 'artistic', 'relaxed'], 'formality': 1},
            'minimalist': {'keywords': ['clean', 'simple', 'understated'], 'formality': 2},
            'preppy': {'keywords': ['classic', 'polished', 'traditional'], 'formality': 3},
        }

    def verify(
        self,
        text: str,
        context: Optional[Dict[str, Any]] = None
    ) -> List[HallucinationIssue]:
        """
        Verify text against knowledge base.

        Args:
            text: Text to verify
            context: Additional context (body_type, occasion, season, etc.)

        Returns:
            List of detected issues
        """
        issues = []
        context = context or {}

        # Verify color season recommendations
        color_season = context.get('color_season')
        if color_season:
            issues.extend(self._verify_color_season(text, color_season))

        # Verify body type recommendations
        body_type = context.get('body_type')
        if body_type:
            issues.extend(self._verify_body_type(text, body_type))

        # Verify occasion appropriateness
        occasion = context.get('occasion')
        if occasion:
            issues.extend(self._verify_occasion(text, occasion))

        # Verify season appropriateness
        season = context.get('season')
        if season:
            issues.extend(self._verify_season(text, season))

        # Use RAG for semantic verification
        if self.rag_service:
            issues.extend(self._verify_with_rag(text, context))

        # Verify garment attributes
        issues.extend(self._verify_garment_attributes(text, context))

        # Verify fabric claims
        issues.extend(self._verify_fabric_claims(text, context))

        return issues

    def _verify_garment_attributes(
        self,
        text: str,
        context: Optional[Dict[str, Any]] = None
    ) -> List[HallucinationIssue]:
        """Verify garment category claims against known attributes."""
        issues = []
        text_lower = text.lower()

        # Check for formality mismatches
        for garment, attrs in self.garment_categories.items():
            garment_pattern = garment.replace('_', ' ')
            if garment_pattern in text_lower:
                formality = attrs['formality']

                # Check if text claims this garment is appropriate for wrong formality
                if formality == 'casual':
                    if re.search(r'(正式|formal|商务|business).*' + garment_pattern, text_lower):
                        issues.append(HallucinationIssue(
                            type=HallucinationType.FACTUAL_ERROR,
                            severity=RuleSeverity.WARNING,
                            description=f'{garment} is typically casual, not formal wear',
                            confidence=0.75,
                            suggestion=f'Consider dress_shirt or blazer for formal occasions',
                            details={'garment': garment, 'expected_formality': formality}
                        ))

                # Check season-garment compatibility
                season = context.get('season') if context else None
                if season and garment in ['shorts', 'tank_top', 'sandals']:
                    if season == 'winter' and 'recommend' in text_lower:
                        issues.append(HallucinationIssue(
                            type=HallucinationType.FACTUAL_ERROR,
                            severity=RuleSeverity.WARNING,
                            description=f'{garment} is not typically recommended for winter',
                            confidence=0.80,
                            suggestion='Consider warmer alternatives for winter',
                            details={'garment': garment, 'season': season}
                        ))

        return issues

    def _verify_fabric_claims(
        self,
        text: str,
        context: Optional[Dict[str, Any]] = None
    ) -> List[HallucinationIssue]:
        """Verify fabric property claims against known characteristics."""
        issues = []
        text_lower = text.lower()

        for fabric, properties in self.fabric_properties.items():
            fabric_pattern = fabric.replace('_', ' ')

            if fabric_pattern in text_lower:
                # Check breathable claims
                if not properties['breathable']:
                    if re.search(r'(透气|breathable).*' + fabric_pattern, text_lower):
                        issues.append(HallucinationIssue(
                            type=HallucinationType.FACTUAL_ERROR,
                            severity=RuleSeverity.INFO,
                            description=f'{fabric} is not typically known for breathability',
                            confidence=0.70,
                            details={'fabric': fabric, 'property': 'breathable'}
                        ))

                # Check season recommendations
                season = context.get('season') if context else None
                if season and season not in properties['seasons'] and 'all' not in properties['seasons']:
                    if re.search(r'(推荐|recommend|适合).*' + fabric_pattern, text_lower):
                        issues.append(HallucinationIssue(
                            type=HallucinationType.FACTUAL_ERROR,
                            severity=RuleSeverity.WARNING,
                            description=f'{fabric} is not typically recommended for {season}',
                            confidence=0.75,
                            suggestion=f'{fabric} is best for: {", ".join(properties["seasons"])}',
                            details={'fabric': fabric, 'season': season}
                        ))

                # Check care instructions
                if properties['care'] == ['dry_clean']:
                    if re.search(r'(机洗|machine.*wash).*' + fabric_pattern, text_lower):
                        issues.append(HallucinationIssue(
                            type=HallucinationType.FACTUAL_ERROR,
                            severity=RuleSeverity.WARNING,
                            description=f'{fabric} typically requires dry cleaning, not machine wash',
                            confidence=0.85,
                            suggestion=f'Recommended care for {fabric}: {", ".join(properties["care"])}',
                            details={'fabric': fabric, 'care': properties['care']}
                        ))

        return issues

    def _verify_color_season(
        self,
        text: str,
        color_season: str
    ) -> List[HallucinationIssue]:
        """Verify color recommendations match color season rules"""
        issues = []

        season_key = color_season.lower()
        facts = self.color_season_facts.get(season_key)

        if not facts:
            return issues

        # Check for recommended colors
        best_colors = facts.get('best_colors', [])
        avoid_colors = facts.get('avoid_colors', [])

        text_lower = text.lower()

        # Check if recommending avoided colors
        for avoid in avoid_colors:
            if avoid.replace('_', ' ') in text_lower:
                # Check if context suggests this is a "don't wear" statement
                negation_patterns = [
                    r'不要.*' + avoid.replace('_', ' '),
                    r'避免.*' + avoid.replace('_', ' '),
                    r'不推荐.*' + avoid.replace('_', ' '),
                    r'avoid.*' + avoid.replace('_', ' '),
                    r'don\'?t.*' + avoid.replace('_', ' ')
                ]

                is_negated = any(
                    re.search(pattern, text_lower)
                    for pattern in negation_patterns
                )

                if not is_negated:
                    issues.append(HallucinationIssue(
                        type=HallucinationType.FACTUAL_ERROR,
                        severity=RuleSeverity.WARNING,
                        description=f'Color {avoid} may not be ideal for {color_season} season',
                        confidence=0.7,
                        suggestion=f'For {color_season}, consider: {", ".join(best_colors[:3])}',
                        details={
                            'color_season': color_season,
                            'mentioned_color': avoid
                        }
                    ))

        return issues

    def _verify_body_type(
        self,
        text: str,
        body_type: str
    ) -> List[HallucinationIssue]:
        """Verify recommendations match body type rules"""
        issues = []

        body_key = body_type.lower().replace('-', '_').replace(' ', '_')
        facts = self.body_type_facts.get(body_key)

        if not facts:
            return issues

        text_lower = text.lower()

        # Check for recommending items to avoid
        for avoid in facts.get('avoid', []):
            avoid_pattern = avoid.replace('_', ' ')
            if avoid_pattern in text_lower:
                # Check negation
                negation_patterns = [
                    r'不要.*' + avoid_pattern,
                    r'避免.*' + avoid_pattern,
                    r'不适合.*' + avoid_pattern,
                    r'avoid.*' + avoid_pattern
                ]

                is_negated = any(
                    re.search(pattern, text_lower)
                    for pattern in negation_patterns
                )

                if not is_negated:
                    issues.append(HallucinationIssue(
                        type=HallucinationType.FACTUAL_ERROR,
                        severity=RuleSeverity.WARNING,
                        description=f'Style "{avoid}" is typically not recommended for {body_type}',
                        confidence=0.75,
                        suggestion=f'For {body_type}, consider: {", ".join(facts.get("recommend", [])[:3])}',
                        details={
                            'body_type': body_type,
                            'mentioned_style': avoid
                        }
                    ))

        return issues

    def _verify_occasion(
        self,
        text: str,
        occasion: str
    ) -> List[HallucinationIssue]:
        """Verify recommendations match occasion rules"""
        issues = []

        occasion_key = occasion.lower().replace('-', '_').replace(' ', '_')
        facts = self.occasion_facts.get(occasion_key)

        if not facts:
            return issues

        text_lower = text.lower()

        # Check for forbidden items
        for forbidden in facts.get('forbidden', []):
            forbidden_pattern = forbidden.replace('_', ' ')
            if forbidden_pattern in text_lower:
                # Check if it's being recommended (not warned against)
                recommendation_patterns = [
                    r'推荐.*' + forbidden_pattern,
                    r'建议.*' + forbidden_pattern,
                    r'可以.*' + forbidden_pattern,
                    r'recommend.*' + forbidden_pattern,
                    r'try.*' + forbidden_pattern
                ]

                is_recommended = any(
                    re.search(pattern, text_lower)
                    for pattern in recommendation_patterns
                )

                if is_recommended:
                    issues.append(HallucinationIssue(
                        type=HallucinationType.FACTUAL_ERROR,
                        severity=RuleSeverity.ERROR,
                        description=f'Item "{forbidden}" is not appropriate for {occasion}',
                        confidence=0.85,
                        details={
                            'occasion': occasion,
                            'forbidden_item': forbidden
                        }
                    ))

        return issues

    def _verify_season(
        self,
        text: str,
        season: str
    ) -> List[HallucinationIssue]:
        """Verify recommendations match season rules"""
        issues = []

        season_key = season.lower()
        facts = self.season_facts.get(season_key)

        if not facts:
            return issues

        text_lower = text.lower()

        # Check for recommending items to avoid in this season
        for avoid in facts.get('avoid', []):
            avoid_pattern = avoid.replace('_', ' ')
            if avoid_pattern in text_lower:
                recommendation_patterns = [
                    r'推荐.*' + avoid_pattern,
                    r'建议.*' + avoid_pattern,
                    r'适合.*' + avoid_pattern,
                    r'recommend.*' + avoid_pattern
                ]

                is_recommended = any(
                    re.search(pattern, text_lower)
                    for pattern in recommendation_patterns
                )

                if is_recommended:
                    issues.append(HallucinationIssue(
                        type=HallucinationType.FACTUAL_ERROR,
                        severity=RuleSeverity.WARNING,
                        description=f'Item "{avoid}" is typically not recommended for {season}',
                        confidence=0.7,
                        suggestion=f'For {season}, consider: {", ".join(facts.get("recommend", [])[:3])}',
                        details={
                            'season': season,
                            'avoided_item': avoid
                        }
                    ))

        return issues

    def _verify_with_rag(
        self,
        text: str,
        context: Dict[str, Any]
    ) -> List[HallucinationIssue]:
        """
        Verify text using RAG retrieval.

        Uses the fashion knowledge RAG system to retrieve relevant
        knowledge and compare with generated text.
        """
        issues = []

        try:
            # Build search query from context
            query_parts = []
            if context.get('body_type'):
                query_parts.append(f"体型 {context['body_type']}")
            if context.get('occasion'):
                query_parts.append(f"场合 {context['occasion']}")
            if context.get('season'):
                query_parts.append(f"季节 {context['season']}")

            query = ' '.join(query_parts) if query_parts else text[:100]

            # Retrieve relevant knowledge
            results = self.rag_service.search(query, top_k=5)

            if not results:
                return issues

            # Extract key facts from retrieved knowledge
            retrieved_facts = []
            for result in results:
                content = result.get('content', '')
                metadata = result.get('metadata', {})

                # Extract facts based on category
                category = metadata.get('category', '')
                if category in self.verify_categories:
                    retrieved_facts.append({
                        'content': content,
                        'category': category,
                        'metadata': metadata
                    })

            # Compare text content with retrieved facts
            # (Simplified check - in production, use semantic similarity)
            for fact in retrieved_facts:
                # Check if there's significant overlap
                fact_content = fact['content'].lower()
                text_lower = text.lower()

                # Simple keyword overlap check
                fact_keywords = set(fact_content.split())
                text_keywords = set(text_lower.split())

                overlap = fact_keywords & text_keywords
                overlap_ratio = len(overlap) / len(fact_keywords) if fact_keywords else 0

                # If very low overlap but text is making specific claims
                # about the same topic, it might be a hallucination
                if overlap_ratio < 0.1:
                    # Check if text is making claims about the same topic
                    topic_keywords = fact['metadata'].get('keywords', [])
                    topic_overlap = any(
                        kw.lower() in text_lower
                        for kw in topic_keywords
                    )

                    if topic_overlap:
                        # Text discusses same topic but doesn't match knowledge
                        issues.append(HallucinationIssue(
                            type=HallucinationType.FACTUAL_ERROR,
                            severity=RuleSeverity.INFO,
                            description='Output may not align with established knowledge',
                            confidence=0.5,
                            details={
                                'category': fact['category'],
                                'knowledge_id': fact['metadata'].get('id', '')
                            }
                        ))

        except Exception as e:
            logger.error(f"RAG verification failed: {e}")

        return issues

    def verify_specific_claim(
        self,
        claim: str,
        category: str,
        context: Optional[Dict[str, Any]] = None
    ) -> VerificationResult:
        """
        Verify a specific claim against knowledge base.

        Args:
            claim: The claim to verify
            category: Knowledge category (body_type, occasion, etc.)
            context: Additional context

        Returns:
            VerificationResult with verification details
        """
        matched_rules = []
        mismatches = []
        sources = []

        # Get relevant facts
        facts_map = {
            'body_type': self.body_type_facts,
            'color_season': self.color_season_facts,
            'occasion': self.occasion_facts,
            'season': self.season_facts
        }

        facts = facts_map.get(category, {})

        # Search through facts
        claim_lower = claim.lower()

        for key, fact_data in facts.items():
            # Check if claim relates to this fact category
            key_pattern = key.replace('_', ' ')
            if key_pattern in claim_lower:
                matched_rules.append({
                    'key': key,
                    'data': fact_data
                })

        # Calculate confidence
        if matched_rules:
            confidence = min(1.0, len(matched_rules) * 0.5)
        else:
            confidence = 0.5  # No conflicting facts found

        return VerificationResult(
            is_verified=len(mismatches) == 0,
            confidence=confidence,
            matched_rules=matched_rules,
            mismatches=mismatches,
            sources=sources
        )
