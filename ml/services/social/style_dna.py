"""StyleDNAService: compute user style vectors and find similar users."""

from __future__ import annotations

import logging
from typing import Any

import numpy as np

from ml.services.rag.qdrant_client import QdrantVectorStore, VectorDocument

logger = logging.getLogger(__name__)

# Interaction type -> weight mapping
INTERACTION_WEIGHTS: dict[str, float] = {
    "purchase": 3.0,
    "favorite": 2.0,
    "try_on": 2.0,
    "view": 1.0,
}


class StyleDNAService:
    """Computes and manages user style DNA vectors for social matching.

    The style DNA is a weighted average of FashionSigLIP item vectors from
    items the user has interacted with. Vectors are stored in Qdrant
    user_style_dna collection for cosine similarity matching.
    """

    def __init__(
        self,
        user_dna_store: QdrantVectorStore,
        fashion_store: QdrantVectorStore,
    ):
        self._user_dna_store = user_dna_store
        self._fashion_store = fashion_store

    async def update_user_vector(
        self,
        user_id: str,
        item_vectors: list[list[float]],
        weights: list[float],
    ) -> None:
        """Compute weighted average of item vectors and upsert to Qdrant.

        Args:
            user_id: User identifier.
            item_vectors: List of 1152-dim embedding vectors for interacted items.
            weights: Interaction weights corresponding to each item vector.
        """
        if not item_vectors or not weights:
            logger.warning("No item vectors or weights provided for user %s", user_id)
            return

        vectors = np.array(item_vectors, dtype=np.float64)
        w = np.array(weights, dtype=np.float64)

        # Weighted average: sum(vec * w) / sum(w)
        weighted = np.sum(vectors * w[:, np.newaxis], axis=0) / np.sum(w)

        # Normalize to unit length for cosine similarity
        norm = np.linalg.norm(weighted)
        if norm > 0:
            weighted = weighted / norm
        else:
            logger.warning("Zero-norm vector for user %s, storing as-is", user_id)

        doc = VectorDocument(
            doc_id=user_id,
            content=f"user_style_dna:{user_id}",
            embedding=weighted.tolist(),
            metadata={"user_id": user_id, "method": "weighted_avg"},
        )

        self._user_dna_store.upsert([doc])
        logger.info("Updated style DNA vector for user %s", user_id)

    async def find_similar_users(
        self,
        user_id: str,
        top_k: int = 10,
    ) -> list[dict[str, Any]]:
        """Find top-K similar users by cosine similarity on style DNA vectors.

        Args:
            user_id: The user to find similar users for.
            top_k: Number of results to return.

        Returns:
            List of {user_id, score} dicts, excluding the querying user.
            Returns empty list for cold-start users (no vector stored).
        """
        # Retrieve the user's own vector
        try:
            client = self._user_dna_store._client
            if client is None:
                return []

            points = client.retrieve(
                collection_name=self._user_dna_store.config.collection_name,
                ids=[user_id],
            )

            if not points:
                logger.info("Cold-start user %s has no style DNA vector", user_id)
                return []

            user_vector = points[0].vector
        except Exception as e:
            logger.error("Failed to retrieve style DNA for user %s: %s", user_id, e)
            return []

        # Search for similar users (top_k+1 to account for self)
        try:
            results = self._user_dna_store.search(
                query_embedding=user_vector,
                top_k=top_k + 1,
            )
        except Exception as e:
            logger.error("Failed to search similar users for %s: %s", user_id, e)
            return []

        # Filter out self and return only non-PII data
        similar = []
        for r in results:
            match_user_id = r.get("doc_id", r.get("metadata", {}).get("user_id", ""))
            if match_user_id == user_id:
                continue
            similar.append({
                "user_id": str(match_user_id),
                "score": float(r.get("score", 0)),
            })

        return similar[:top_k]

    async def compute_from_behaviors(
        self,
        user_id: str,
        item_ids: list[str],
        interaction_types: list[str],
    ) -> None:
        """Compute style DNA from user behavior history.

        For each item, fetches its vector from fashion_knowledge collection
        and maps interaction_type to weight.

        Args:
            user_id: User identifier.
            item_ids: List of item IDs the user interacted with.
            interaction_types: Corresponding interaction types for each item.
        """
        if len(item_ids) != len(interaction_types):
            logger.error(
                "item_ids and interaction_types must have same length for user %s",
                user_id,
            )
            return

        item_vectors: list[list[float]] = []
        weights: list[float] = []

        client = self._fashion_store._client
        if client is None:
            logger.error("Fashion store client not initialized")
            return

        for item_id, interaction_type in zip(item_ids, interaction_types):
            weight = INTERACTION_WEIGHTS.get(interaction_type, 1.0)
            weights.append(weight)

            # Fetch item vector from fashion_knowledge collection
            try:
                points = client.retrieve(
                    collection_name=self._fashion_store.config.collection_name,
                    ids=[item_id],
                )
                if points and hasattr(points[0], "vector") and points[0].vector:
                    item_vectors.append(points[0].vector)
                else:
                    logger.warning("No vector found for item %s", item_id)
                    # Remove corresponding weight if no vector
                    weights.pop()
            except Exception as e:
                logger.warning("Failed to fetch vector for item %s: %s", item_id, e)
                weights.pop()

        if not item_vectors:
            logger.warning("No item vectors found for user %s", user_id)
            return

        await self.update_user_vector(user_id, item_vectors, weights)
