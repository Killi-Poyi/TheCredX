# CredX Microservices

This directory contains microservices for article classification, scraping, and content processing.

---

## Microservices Overview

- **classifier**: Embeds and classifies articles into categories using a lightweight, incrementally-trainable model.
- **scraper**: Fetches and cleans articles from the web, verifies authenticity, and uploads content to storage.
- **controller**: Orchestrates workflows and integrates with external APIs (e.g., Gemini for summarization).

---

## Categories

- Autos and vehicles
- Comedy
- Education
- Entertainment
- Film and animation
- Gaming
- How-to and style
- Music
- News and politics
- Nonprofits and activism
- People and blogs
- Pets and animals
- Science and technology
- Sports
- Travel and events

---

## Classifier Microservice

### Model Architecture

- **Embeddings**: Uses [SentenceTransformer](https://www.sbert.net/) for document embeddings (pretrained, not retrained).
- **Classifier**: SGDClassifier (logistic regression, supports online/incremental learning).
- **Pipeline**:  
  1. Chunk article (split into paragraphs)  
  2. Embed each chunk  
  3. Average embeddings for document representation  
  4. Classify with SGDClassifier

### Training Example Output

```
Validation results:
                         precision    recall  f1-score   support

     Autos and vehicles       1.00      0.85      0.92        13
                 Comedy       0.83      1.00      0.91        15
              Education       1.00      0.93      0.97        15
          Entertainment       0.89      0.53      0.67        15
     Film and animation       0.94      1.00      0.97        15
                 Gaming       1.00      0.87      0.93        15
       How-to and style       0.87      0.87      0.87        15
                  Music       0.94      1.00      0.97        15
      News and politics       1.00      1.00      1.00        18
Nonprofits and activism       0.79      1.00      0.88        15
       People and blogs       0.89      0.94      0.92        18
       Pets and animals       0.95      1.00      0.97        18
 Science and technology       1.00      0.93      0.96        14
                 Sports       0.90      1.00      0.95        18
      Travel and events       1.00      0.93      0.97        15

               accuracy                           0.93       234
              macro avg       0.93      0.92      0.92       234
           weighted avg       0.93      0.93      0.92       234
```