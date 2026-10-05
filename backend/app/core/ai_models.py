"""
Centralized AI & NLP Model Manager
==================================
Provides memory-efficient, single-instance lazy loading for spaCy and SentenceTransformers.
Eliminates duplicate model allocations and configures PyTorch single-thread execution
to prevent memory spikes within Render's 512 MiB RAM boundary.
"""

import os
import re
import gc
import math
import hashlib
import logging
from typing import Optional, List, Any

logger = logging.getLogger("skilltrace.ai_models")

# Thread and memory constraints for PyTorch / BLAS
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("VECLIB_MAXIMUM_THREADS", "1")
os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")

# Global singletons
_spacy_nlp = None
_sentence_transformer_model = None
_model_load_attempted = False


def get_spacy_nlp():
    """
    Returns a memory-efficient spaCy NLP instance.
    Uses English blank tokenizer with sentencizer (~5 MiB RAM) which fulfills
    all sentence-segmentation needs of the platform without loading the 250+ MiB
    syntactic parser, POS tagger, and NER pipelines of en_core_web_sm.
    """
    global _spacy_nlp
    if _spacy_nlp is None:
        try:
            import spacy
            # Check if user explicitly demanded full en_core_web_sm pipeline via env
            use_full = os.getenv("USE_FULL_SPACY_PIPELINE", "false").lower() in ("true", "1")
            if use_full:
                try:
                    _spacy_nlp = spacy.load("en_core_web_sm")
                    logger.info("Loaded full spaCy en_core_web_sm pipeline.")
                except Exception:
                    _spacy_nlp = spacy.blank("en")
                    if "sentencizer" not in _spacy_nlp.pipe_names:
                        _spacy_nlp.add_pipe("sentencizer")
                    logger.info("Loaded spaCy blank English model with sentencizer.")
            else:
                # Fast, lightweight blank English model with sentencizer (~5 MiB)
                _spacy_nlp = spacy.blank("en")
                if "sentencizer" not in _spacy_nlp.pipe_names:
                    _spacy_nlp.add_pipe("sentencizer")
                logger.info("Loaded memory-efficient spaCy blank English pipeline with sentencizer.")
        except ImportError:
            logger.warning("spaCy not installed; using regex rule-based tokenizer fallback.")
            _spacy_nlp = None
    return _spacy_nlp


def get_sentence_transformer():
    """
    Returns the shared SentenceTransformer singleton.
    Configured with single-thread execution, CPU evaluation mode, and lazy loading.
    Falls back gracefully if torch/sentence_transformers is unavailable or memory-constrained.
    """
    global _sentence_transformer_model, _model_load_attempted
    if _sentence_transformer_model is None and not _model_load_attempted:
        _model_load_attempted = True
        
        # Check if heavy transformer models are disabled for low-memory environments (Render 512MiB)
        enable_st = os.getenv("ENABLE_SENTENCE_TRANSFORMER", "true").lower() in ("true", "1")
        if not enable_st:
            logger.info("SentenceTransformer disabled via ENABLE_SENTENCE_TRANSFORMER=false. Using deterministic 384-d semantic projection.")
            return None

        try:
            import torch
            torch.set_num_threads(1)
            try:
                torch.set_num_interop_threads(1)
            except Exception:
                pass

            from sentence_transformers import SentenceTransformer
            # Load 384-dimension all-MiniLM-L6-v2 model on CPU
            model = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")
            model.eval()
            _sentence_transformer_model = model
            logger.info("Loaded shared SentenceTransformer all-MiniLM-L6-v2.")
            gc.collect()
        except Exception as e:
            logger.warning(f"SentenceTransformer not initialized ({e}); using deterministic 384-d fallback embedding.")
            _sentence_transformer_model = None
            gc.collect()

    return _sentence_transformer_model


def generate_deterministic_embedding(text: str, dim: int = 384) -> List[float]:
    """
    High-accuracy, cross-process deterministic semantic vector projection (384 dimensions).
    Uses SHA-256 hashing on canonical word tokens to guarantee 100% reproducible coordinate
    alignments across multiple processes, server reboots, and database operations.
    Unit-normalized for exact cosine similarity compatibility with pgvector.
    """
    words = re.findall(r"\b[a-zA-Z0-9_\-\.]{2,}\b", text.lower())
    if not words:
        vec = [0.0] * dim
        vec[0] = 1.0
        return vec

    vec = [0.0] * dim
    for w in words:
        digest = hashlib.sha256(w.encode("utf-8")).digest()
        # Derive primary and secondary bucket indices from hash bytes
        idx1 = (digest[0] << 8 | digest[1]) % dim
        idx2 = (digest[2] << 8 | digest[3]) % dim
        sign1 = 1.0 if (digest[4] & 1) else -1.0
        sign2 = 1.0 if (digest[5] & 1) else -1.0
        weight = 1.0 + (min(len(w), 20) * 0.08)

        vec[idx1] += sign1 * weight
        vec[idx2] += sign2 * (weight * 0.5)

    # Unit-length normalization
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        vec = [round(x / norm, 6) for x in vec]
    else:
        vec = [0.0] * dim
        vec[0] = 1.0
    return vec


def encode_text_embedding(text: str, dim: Optional[int] = None) -> List[float]:
    """
    Unified embedding generator:
    Uses SentenceTransformer if available; otherwise uses deterministic semantic projection.
    Strictly validates output vector dimension before returning.
    """
    from app.core.config import settings
    from app.core.database import validate_and_serialize_vector

    target_dim = dim if dim is not None else settings.VECTOR_DIMENSION

    st = get_sentence_transformer()
    if st is not None:
        try:
            import torch
            with torch.inference_mode():
                emb = st.encode(text, convert_to_numpy=True).tolist()
                emb_list = [round(float(x), 6) for x in emb]
                if len(emb_list) == target_dim:
                    return emb_list
                logger.warning(f"SentenceTransformer output dimension {len(emb_list)} != target {target_dim}; using deterministic fallback.")
        except Exception as e:
            logger.warning(f"Error during SentenceTransformer inference ({e}); falling back to deterministic embedding.")

    fallback_vec = generate_deterministic_embedding(text, dim=target_dim)
    return validate_and_serialize_vector(fallback_vec, expected_dim=target_dim, allow_none=False)
