# tag_extractor.py
import re
import nltk
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
import logging

logger = logging.getLogger(__name__)

# Ensure NLTK resources are downloaded to the current directory
nltk_data_dir = os.path.join(os.path.dirname(__file__), 'nltk_data')
os.makedirs(nltk_data_dir, exist_ok=True)

# Set NLTK data path to local directory before checking for resources
nltk.data.path.insert(0, nltk_data_dir)

for resource in [
    ("tokenizers/punkt", "punkt"),
    ("tokenizers/punkt_tab", "punkt_tab"),
    ("corpora/stopwords", "stopwords"),
    ("corpora/wordnet", "wordnet")
]:
    try:
        nltk.data.find(resource[0])
    except LookupError:
        nltk.download(resource[1], download_dir=nltk_data_dir)

stop_words = set(stopwords.words("english"))
lemmatizer = WordNetLemmatizer()


def preprocess(text: str) -> str:
    """Clean and lemmatize text."""
    text = text.lower()
    text = re.sub(r"http\S+|www\S+|https\S+", "", text)  # remove urls
    text = re.sub(r"[^a-z\s]", "", text)  # keep only letters
    tokens = nltk.word_tokenize(text)
    tokens = [
        lemmatizer.lemmatize(w)
        for w in tokens
        if w not in stop_words and len(w) > 3
    ]
    return " ".join(tokens)


def extract_tags(title: str, content: str, top_k: int = 15):
    """Extract top-k tags using TF-IDF with lemmatization and title weighting."""
    # Weight title higher by repeating it 3x
    weighted_text = (title + " ") * 3 + content

    # Preprocess
    processed = preprocess(weighted_text)

    # TF-IDF on unigrams + bigrams
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), max_features=5000)
    tfidf_matrix = vectorizer.fit_transform([processed])
    scores = tfidf_matrix.toarray()[0]
    feature_names = vectorizer.get_feature_names_out()

    # Rank terms by TF-IDF score
    ranked = sorted(
        zip(feature_names, scores), key=lambda x: x[1], reverse=True
    )

    # Select top_k unique tags
    tags = [term for term, score in ranked[:top_k]]
    logger.info(f"Extracted tags: {tags}")
    return tags


# Example usage
if __name__ == "__main__":
    title = "Android's New Walls: Deconstructing Google's Plan to Verify Every Sideloaded App"
    content = """
      hellow this is just another update from the google to update their google play store policies
    """
    tags = extract_tags(title, content, top_k=15)
    print("Extracted Tags:", tags)
