"""
model_service.py
===============

This module provides a service interface for text classification using a sentence-transformer embedder and a scikit-learn classifier.

Main Functions:
---------------
- classify_text(text, top_k=3):
    Classifies a given text into one of the trained categories.
    Returns a dictionary with the top label, confidence, and top-k probabilities.

- incremental_update(new_texts, new_labels):
    Incrementally updates the base SGDClassifier with new labeled data using partial_fit.
    Persists the updated model bundle to disk. (No recalibration is done here.)

Details:
--------
- Loads a model bundle (CalibratedClassifierCV for inference, SGDClassifier for updates, label mappings, embedder info) from disk.
- Embeds input text using the same sentence-transformer model as used in training.
- Supports thread-safe incremental updates.
- Uses softmax on decision_function output for probability estimates if available, otherwise uses predict_proba.

Usage:
------
from model_service import classify_text, incremental_update
result = classify_text("Some article text")

Thread Safety:
--------------
- Model updating is protected by a threading lock (_lock) to ensure atomic updates.

"""
import joblib
import numpy as np
from sentence_transformers import SentenceTransformer
from classifier.utils import embed_texts
import threading
from sklearn.linear_model import SGDClassifier
import logging
import os

MICROSERVICE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_FILE_PATH = os.path.join(MICROSERVICE_DIR, "model_bundle.pkl")
_lock = threading.Lock()

logger = logging.getLogger(__name__)


def softmax(x):
    """
    Compute the softmax of a numpy array.

    Args:
        x (np.ndarray): Input array.

    Returns:
        np.ndarray: Softmax-transformed array.
    """
    e = np.exp(x - np.max(x))
    return e / e.sum(axis=-1)


def load_bundle(path=MODEL_FILE_PATH):
    """
    Load the model bundle and sentence transformer embedder from disk.

    Args:
        path (str): Path to the model bundle file.

    Returns:
        tuple: (bundle dict, embedder instance)
    """
    if os.path.exists(path) is False:
        logger.info("Model bundle not found at %s. Creating a new model", path)
        from classifier.train import initial_train
        initial_train()
    logger.info("Loading model bundle from %s", path)
    bundle = joblib.load(path)
    embedder = SentenceTransformer(bundle["embed_model"])
    logger.info("Model bundle and embedder loaded successfully.")
    return bundle, embedder


# load once (you can also lazy-load in functions)
bundle, embedder = load_bundle()
clf = bundle["clf"]  # CalibratedClassifierCV for inference
idx2label = bundle["idx2label"]
label2idx = bundle["label2idx"]
base_clf = bundle.get("base_clf", None)  # SGDClassifier for updates


def classify_text(text, top_k=3):
    """
    Classify a given text into one of the trained categories.

    Args:
        text (str): The input text to classify.
        top_k (int): Number of top probabilities to return.

    Returns:
        dict: {
            'label': str,
            'confidence': float,
            'top_probs': list of (label, prob),
            'all_probs': dict of label -> prob
        }

    Raises:
        Exception: If embedding or classification fails.
    """
    try:
        X = embed_texts([text], embedder=embedder)  # returns shape (1, dim)
        # ensure shape then optional normalize (embed_texts already normalizes)
        if hasattr(clf, "decision_function"):
            scores = clf.decision_function(X)  # shape (1, n_classes)
            if scores.ndim == 1:
                probs = softmax(scores)
            else:
                probs = softmax(scores[0])
        else:
            # fallback to predict_proba if available
            probs = clf.predict_proba(X)[0]
        top_idx = int(np.argmax(probs))
        top_label = idx2label[top_idx]
        top_conf = float(probs[top_idx])
        top_probs = sorted([(idx2label[i], float(probs[i]))
                           for i in range(len(probs))], key=lambda x: -x[1])[:top_k]
        logger.info(
            "Classification result: label=%s, confidence=%.4f", top_label, top_conf)
        return {"label": top_label, "confidence": top_conf, "top_probs": top_probs, "all_probs": {idx2label[i]: float(probs[i]) for i in range(len(probs))}}
    except Exception as e:
        logger.error("Error during classification: %s", str(e), exc_info=True)
        raise


def incremental_update(new_texts, new_labels, batch_size=128):
    """
    Incrementally update the base SGDClassifier with new labeled data using partial_fit.

    Args:
        new_texts (list of str): New input texts.
        new_labels (list of str): Corresponding labels (must be in existing categories).
        batch_size (int): Batch size for updates (currently unused).

    Returns:
        None

    Raises:
        Exception: If update fails.
    """
    global bundle, embedder, clf, idx2label, label2idx, base_clf
    logger.info("Starting incremental update with %d new samples.",
                len(new_texts))
    try:
        X = embed_texts(new_texts, embedder=embedder)
        y = np.array([label2idx[l] for l in new_labels])
        with _lock:
            if base_clf is None:
                # Try to extract from calibrated clf if possible
                if hasattr(clf, "base_estimator"):
                    base_clf = clf.base_estimator
                elif hasattr(clf, "estimator"):
                    base_clf = clf.estimator
                else:
                    base_clf = SGDClassifier(
                        loss="log_loss", max_iter=1000, tol=1e-3)
                    base_clf.partial_fit(
                        X, y, classes=np.arange(len(idx2label)))
            base_clf.partial_fit(X, y)
            bundle["base_clf"] = base_clf
            joblib.dump(bundle, MODEL_FILE_PATH)
        logger.info("Incremental update completed and model persisted.")
    except Exception as e:
        logger.error("Error during incremental update: %s",
                     str(e), exc_info=True)
        raise


if __name__ == "__main__":
    # Example usage
    sample_text = "This is a sample article text about technology and innovation."
    result = classify_text(sample_text)
    print("Classification Result:", result)