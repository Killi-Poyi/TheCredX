import os

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.preprocessing import normalize

EMBED_MODEL = "sentence-t5-base"
# EMBED_MODEL = "all-MiniLM-L6-v2"
LOCAL_MODEL_PATH = "./sentence-t5-base-local"
# LOCAL_MODEL_PATH = "./all-MiniLM-L6-v2-local"

# Download and save the model locally if not already present
if not os.path.exists(LOCAL_MODEL_PATH):
    embedder = SentenceTransformer(EMBED_MODEL)
    embedder.save(LOCAL_MODEL_PATH)


def chunk_text(text, max_words=250):
    words = text.split()
    if len(words) <= max_words:
        return [text]
    return [" ".join(words[i:i+max_words]) for i in range(0, len(words), max_words)]


def chunk_text_overlap(text, chunk_size=400, overlap=100):
    words = text.split()
    if len(words) <= chunk_size:
        return [text]
    chunks = []
    start = 0
    while start < len(words):
        end = min(len(words), start + chunk_size)
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        if end == len(words):
            break
        start += chunk_size - overlap
    return chunks


def chunk_text_by_tokens(text, tokenizer, chunk_size=400, overlap=50, max_length=256):
    tokens = tokenizer.tokenize(text)
    if len(tokens) <= chunk_size:
        # Truncate to max_length if needed
        chunk = tokenizer.convert_tokens_to_string(tokens[:max_length])
        return [chunk]
    chunks = []
    start = 0
    while start < len(tokens):
        end = min(len(tokens), start + chunk_size)
        chunk_tokens = tokens[start:end]
        # Truncate to max_length for model safety
        chunk_tokens = chunk_tokens[:max_length]
        chunk = tokenizer.convert_tokens_to_string(chunk_tokens)
        chunks.append(chunk)
        if end == len(tokens):
            break
        start += chunk_size - overlap
    return chunks


def embed_texts(texts, embedder=None, chunk_size=400, overlap=50, batch_size=32, pool_method="mean"):
    """
    Embed a list of texts (handles long texts by chunking + pooling).
    Uses overlapping token chunks for better context.
    pool_method: 'mean', 'max', or 'weighted' (default: mean)
    Returns numpy array shape (n_texts, dim)
    """
    if embedder is None:
        embedder = SentenceTransformer(EMBED_MODEL)
    tokenizer = embedder.tokenizer if hasattr(embedder, 'tokenizer') else None
    # Get model max length if available
    max_length = getattr(embedder, 'max_seq_length', 256)
    all_vecs = []
    for t in texts:
        if tokenizer is not None:
            chunks = chunk_text_by_tokens(t, tokenizer, chunk_size=chunk_size, overlap=overlap, max_length=max_length)
        else:
            chunks = chunk_text_overlap(t, chunk_size=chunk_size, overlap=overlap)
        vecs = embedder.encode(chunks, convert_to_numpy=True, show_progress_bar=False, batch_size=batch_size)
        if vecs.ndim == 1:
            vec = vecs
        else:
            if pool_method == "max":
                vec = vecs.max(axis=0)
            elif pool_method == "weighted":
                weights = np.array([len(chunk) for chunk in chunks])
                weights = weights / weights.sum()
                vec = (vecs.T @ weights).T
            else:  # mean
                vec = vecs.mean(axis=0)
        all_vecs.append(vec)
    X = np.vstack(all_vecs)
    X = normalize(X)
    return X
