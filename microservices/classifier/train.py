"""
This script trains a text classification model using sentence-transformer embeddings and SGDClassifier.
The trained model bundle is saved in the classifier microservice folder for consistent access.
"""


import pandas as pd
import numpy as np
import joblib
from sklearn.linear_model import SGDClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from sklearn.utils import shuffle
from classifier.utils import embed_texts, EMBED_MODEL
from sentence_transformers import SentenceTransformer
import os

MICROSERVICE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_OUT = os.path.join(MICROSERVICE_DIR, "model_bundle.pkl")


def load_data(csv_path) -> pd.DataFrame:
    """
    Load data from a CSV file, dropping rows with missing text or label.

    Args:
        csv_path (str): Path to the CSV file.

    Returns:
        pd.DataFrame: Cleaned DataFrame.
    """
    df = pd.read_csv(csv_path)
    df = df.dropna(subset=["text", "label"])
    return df


def prepare_labels(labels) -> tuple:
    """
    Prepare label mappings and convert labels to indices.

    Args:
        labels (list): List of label strings.

    Returns:
        tuple: (y, classes, label2idx, idx2label)
    """
    classes = sorted(list(set(labels)))
    label2idx = {c: i for i, c in enumerate(classes)}
    idx2label = {i: c for c, i in label2idx.items()}
    y = np.array([label2idx[l] for l in labels])
    return y, classes, label2idx, idx2label


def initial_train(test_size=0.15, batch_size=128) -> None:
    """
    Train and calibrate a text classifier, then save the model bundle.

    Args:
        test_size (float): Fraction of data to use for validation.
        batch_size (int): Batch size for partial_fit.

    Returns:
        None
    """
    data_path = os.path.join(
        os.path.dirname(__file__), "data", "train.csv")
    df = load_data(data_path)

    # Filter out classes with <2 samples
    class_counts = df['label'].value_counts()
    valid_classes = class_counts[class_counts >= 2].index.tolist()
    dropped_classes = class_counts[class_counts < 2].index.tolist()
    if dropped_classes:
        print(f"Warning: Dropping classes with <2 samples: {dropped_classes}")
    
    df = df[df['label'].isin(valid_classes)]
    texts = df["text"].astype(str).tolist()
    labels = df["label"].astype(str).tolist()

    y, classes, label2idx, idx2label = prepare_labels(labels)
    print(f"Classes: {classes}")

    # embed all texts (can be done in batches if memory limited)
    embedder = SentenceTransformer(EMBED_MODEL)
    X = embed_texts(texts, embedder=embedder)

    # train/test split
    X, y = shuffle(X, y, random_state=42)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=42, stratify=y)  # ;)

    # classifier: SGD with log loss (approx logistic regression) supports partial_fit
    clf = SGDClassifier(loss="log_loss", max_iter=1000, tol=1e-3)
    calibrated_clf = CalibratedClassifierCV(clf, method="sigmoid", cv=5)
    calibrated_clf.fit(X_train, y_train)
    clf = calibrated_clf  # Use the calibrated classifier for evaluation and saving

    n = X_train.shape[0]
    classes_idx = np.arange(len(classes))
    base_clf = SGDClassifier(loss="log_loss", max_iter=1000, tol=1e-3)
    for start in range(0, n, batch_size):
        end = min(n, start + batch_size)
        Xb = X_train[start:end]
        yb = y_train[start:end]
        if start == 0:
            base_clf.partial_fit(Xb, yb, classes=classes_idx)
        else:
            base_clf.partial_fit(Xb, yb)

    # Calibrate the classifier after initial training
    calibrated_clf = CalibratedClassifierCV(base_clf, method="sigmoid", cv=5)
    calibrated_clf.fit(X_train, y_train)
    clf = calibrated_clf  # Use calibrated_clf for evaluation and saving

    # evaluate
    ypred = clf.predict(X_test)
    print("Validation results:")
    print(classification_report(y_test, ypred, target_names=classes))

    # save bundle
    bundle = {
        "clf": clf,
        "label2idx": label2idx,
        "idx2label": idx2label,
        "embed_model": EMBED_MODEL
    }
    joblib.dump(bundle, MODEL_OUT)
    print("Saved model bundle to", MODEL_OUT)
