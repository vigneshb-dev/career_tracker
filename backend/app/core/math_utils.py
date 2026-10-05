"""
Mathematical and Vector Utilities for SkillTrace.
Canonical implementations for vector similarities, normalization, and metrics.
"""

import math
from typing import List, Dict, Union


def cosine_similarity(
    v1: Union[List[float], Dict[str, float]], 
    v2: Union[List[float], Dict[str, float]]
) -> float:
    """
    Computes cosine similarity between two float vectors or sparse dict vectors.
    Returns a float in the range [0.0, 1.0].
    """
    if isinstance(v1, dict) and isinstance(v2, dict):
        keys = set(v1.keys()) | set(v2.keys())
        if not keys:
            return 0.0
        v1_list = [float(v1.get(k, 0.0)) for k in keys]
        v2_list = [float(v2.get(k, 0.0)) for k in keys]
        return cosine_similarity(v1_list, v2_list)

    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm_a = math.sqrt(sum(a * a for a in v1))
    norm_b = math.sqrt(sum(b * b for b in v2))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return max(0.0, min(1.0, dot / (norm_a * norm_b)))


# Canonical alias for compatibility
vector_cosine_similarity = cosine_similarity

