import json
import logging
import os
import time

import requests
from classifier.model_service import classify_text
from controller.db_controller import (close_connection, execute_query,
                                      make_connection)
from controller.gemini import create_gemini_client, generate_text
from dotenv import load_dotenv
from psycopg2 import Error as sqle
from scraper.scraper_mod import ScraperMod
from sentence_transformers import SentenceTransformer
from tag_extraction.get_tags import extract_tags

load_dotenv()


def delete_queue_item():
    delete_response = requests.delete(
        os.getenv("API_SERVER", "http://localhost:3000") + "/api/bloc/queue")
    if delete_response.status_code != 200:
        logging.error(
            f"Failed to delete queue item: {delete_response.text}")
    logging.info("Deleted processed queue item")


def main():
    """
    Main execution function.
    """
    db_connection = None
    gemini_client = None
    try:
        # Initialize persistent connections
        db_connection = make_connection()
        gemini_client = create_gemini_client()
        cur = db_connection.cursor()

        EMBED_MODEL = "sentence-t5-base"
        LOCAL_MODEL_PATH = "./sentence-t5-base-local"

        if not os.path.exists(LOCAL_MODEL_PATH):
            embedder = SentenceTransformer(EMBED_MODEL)
            embedder.save(LOCAL_MODEL_PATH)

        embedder = SentenceTransformer(EMBED_MODEL)

        while True:
            try:
                # Fetch articles from the queue API
                response = requests.get(
                    (os.getenv("API_SERVER", "http://localhost:3000")) + "/api/bloc/queue")
                if response.status_code != 200:
                    logging.error(f"Failed to fetch queue: {response.text}")
                    time.sleep(30)  # Wait before retrying
                    continue

                queue_data = response.json()
                if not queue_data:
                    logging.info(
                        "No articles in the queue. Retrying in 30 seconds...")
                    time.sleep(30)
                    continue

                item = queue_data.get("message")
                if not item:
                    logging.error("No message in queue data. Skipping...")
                    time.sleep(30)
                    continue

                website_id = item.get("website_id")
                article_url = item.get("article_url")
                budget = item.get("budget")
                promoter_id = item.get("promoter_id")

                if not article_url or not budget or not website_id or not promoter_id:
                    logging.error(
                        "Invalid data in queue item. Deleting from queue...")
                    delete_queue_item()
                    time.sleep(30)
                    continue

                logging.info(f"Processing article: {article_url}")

                # Fetch website ID and verification token
                verification_token = execute_query(cursor=cur, query="""
                SELECT verification_token FROM websites WHERE website_id = %s
                """, params=(website_id,), fetch=True)
                if not verification_token:
                    logging.error("No verification token provided.")
                    delete_queue_item()
                    time.sleep(30)
                    continue
                # Assuming single row, single column
                verification_token = verification_token[0]

                scraper = ScraperMod(article_url=article_url,
                                     verification_code=verification_token, promoter_id=promoter_id)

                soup = scraper.fetch_article_html()
                if not soup:
                    logging.error("Failed to fetch article HTML.")
                    delete_queue_item()
                    time.sleep(30)
                    continue

                # If allowed, scrape the article page for title, author, date, content
                if scraper.website_status(website_id) and scraper.has_credx_verification(soup):
                    if not scraper.check_budget(entered_budget=budget):
                        logging.warning(
                            "Insufficient budget. Skipping article.")
                        delete_queue_item()
                        time.sleep(30)
                        continue
                    content = scraper.scrape_and_clean_article(soup)
                    if not content:
                        logging.warning("Could not extract content.")
                        delete_queue_item()
                        time.sleep(30)
                        continue

                    unique_id = scraper.generate_unique_identifier()
                    filename = f"{unique_id}.txt"
                    scraper.upload_to_s3(content=content,
                                         bucket="credx", object_name=filename)
                    logging.info(f"Uploaded: {filename}")

                    title = content.strip().splitlines()[0]
                    title_image = scraper.get_title_image(soup)
                    category = classify_text(content)['label']
                    tags = extract_tags(
                        title=title, content=content, top_k=15)

                    prompt = f"""
                    Generate a very short blog post summary in 80 words or less from the below context, 
                    make sure it is super interesting such that it compels the user to click and read the full article. 
                    output should be in plain text only Context: {content}"""
                    summary = generate_text(
                        client=gemini_client, prompt=prompt, model="gemini-2.5-flash")

                    impressions = budget * 10
                    boost = 1.0

                    text = f"{title} {summary} {' '.join(tags)}"
                    emb = embedder.encode(
                        text, normalize_embeddings=True)
                    emb_list = emb.tolist()
                    emb_sql = "[" + ",".join([str(x)
                                              for x in emb_list]) + "]"

                    promotion_insertion_status = execute_query(cursor=cur, query="""
                        INSERT INTO promotions 
                            (title,
                            image_url,
                            summary, 
                            tags, 
                            categories,
                            article_url, 
                            budget,
                            remaining_impressions,
                            boost, 
                            embedding,
                            promoter_id,
                            s3_path,
                            status,
                            website_id
                            )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s::vector, %s, %s, %s, %s)
                        RETURNING promotion_id
                    """, params=(title, title_image, summary, tags, category, article_url, budget, impressions, 
                                 boost, emb_sql, promoter_id, filename, "active", website_id), fetch=True)
                    if not promotion_insertion_status or promotion_insertion_status[0] is None:
                        logging.error(
                            "Failed to insert promotion into the database.")
                        delete_queue_item()
                        time.sleep(30)
                        continue

                    logging.info(
                        "Successfully processed and stored article")
                    db_connection.commit()
                    logging.info("Database changes committed.")
                    delete_queue_item()
                else:
                    logging.info("Skipping unverified article")
                    delete_queue_item()

            except sqle as sqlee:
                logging.error(f"Database error: {sqlee}")
                delete_queue_item()
            except json.JSONDecodeError as jde:
                logging.error(f"JSON decode error: {jde}")
                delete_queue_item()
            except requests.RequestException as re:
                logging.error(f"Request error: {re}")
                delete_queue_item()
            except Exception as e:
                logging.error(f"An error occurred during processing: {e}")
                delete_queue_item()

            # Wait for 30 seconds before checking the queue again
            time.sleep(30)

    except Exception as e:
        logging.critical(f"An unexpected error occurred: {e}")
    finally:
        if db_connection:
            close_connection(db_connection)
        if gemini_client:
            logging.info("Closing Gemini client connection.")


if __name__ == "__main__":

    # Configure logging for better debugging and monitoring
    logging.basicConfig(level=logging.INFO,
                        format='%(asctime)s - %(levelname)s - %(message)s')

    main()