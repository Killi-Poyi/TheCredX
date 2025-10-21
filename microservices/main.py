from sentence_transformers import SentenceTransformer
import os
import logging
from classifier.model_service import classify_text
from tag_extraction.get_tags import extract_tags
from controller.db_controller import make_connection, close_connection, execute_query
from controller.gemini import create_gemini_client, generate_text
from dotenv import load_dotenv
from scraper.scraper_mod import ScraperMod
load_dotenv()


def main(article_url: str = None, verification_code: str = None, promoter_id: int = None, budget: int = None):
    """
    Main execution function.
    """
    if not article_url or not verification_code or not promoter_id or not budget:
        logging.error("Article URL and verification code must be provided.")
        return
    try:
        logging.info(f"Processing article: {article_url}")
        # init connection
        db_connection = make_connection()
        gemini_client = create_gemini_client()

        EMBED_MODEL = "sentence-t5-base"
        LOCAL_MODEL_PATH = "./sentence-t5-base-local"

        if not os.path.exists(LOCAL_MODEL_PATH):
            embedder = SentenceTransformer(EMBED_MODEL)
            embedder.save(LOCAL_MODEL_PATH)

        embedder = SentenceTransformer(EMBED_MODEL)

        scraper = ScraperMod(article_url=article_url,
                             verification_code=verification_code)

        cur = db_connection.cursor()
        soup = scraper.fetch_article_html()

        # if allowed, scrape the article page for title, author, date, content
        if scraper.has_credx_verification(soup):
            content = scraper.scrape_and_clean_article(soup)
            # Extract the title as the first non-empty line from content
            if content:
                unique_id = scraper.generate_unique_identifier()
                filename = f"{unique_id}.txt"
                scraper.upload_to_s3(content=content,
                                     bucket="credx", object_name=filename)
                logging.info(f"Uploaded: {filename}")

                # get title of the article
                title = content.strip().splitlines()[0]

                # get the main image of the article
                title_image = scraper.get_title_image(soup)

                # get the category of the article
                category = classify_text(content)['label']

                # generate 15 tags for the article
                tags = extract_tags(title="", content=content, top_k=15)

                # get website_id from the database, insert if not exists
                website_id = execute_query(
                    cursor=cur,
                    query="SELECT website_id FROM websites WHERE verification_token = %s",
                    params=(verification_code,), fetch=True
                )

                if not website_id:
                    logging.error("Invalid verification code provided.")
                    raise Exception("Invalid verification code")
                website_id = website_id[0]

                # generate description for the article
                prompt = f"""
                Generate a very short blog post summary in 80 words or less from the below context, 
                make sure it is super interesting such that it compels the user to click and read the full article. 
                output should be in plain text only Context: {content}"""
                description = generate_text(
                    client=gemini_client, prompt=prompt, model="gemini-2.5-flash")

                # store the article metadata in the database
                query = """
                    INSERT INTO content_items (
                        website_id, title, original_url, description, s3_path, image_url, category, tags, status
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s
                    ) returning content_id;
                """
                params = (
                    website_id,
                    title,
                    article_url,
                    description,
                    filename,
                    title_image,
                    category,
                    tags,
                    'active'
                )
                query_status = execute_query(
                    cursor=cur, query=query, params=params)
                if (query_status != 200):
                    logging.error(
                        f"Failed to insert article metadata"
                    )
                    raise Exception("Metadata insertion failed")

                article_id = cur.fetchone()[0]
                logging.info(f"Inserted article with ID: {article_id}")

                # TODO: calculate boost based on money spent by the website owner
                impressions = 0
                boost = 1.0

                # create vector embeddings for the article content
                text = f"{title} {description} {' '.join(tags)}"
                emb = embedder.encode(
                    text, normalize_embeddings=True)  # 768-dim
                emb_list = emb.tolist()
                emb_sql = "[" + ",".join([str(x) for x in emb_list]) + "]"

                # store the vector embeddings in the vector database
                status = execute_query(cursor=cur, query="""
                    INSERT INTO promotions 
                        (article_id, 
                        title,
                        summary, 
                        tags, 
                        categories, 
                        promoter_id, 
                        budget,
                        boost, 
                        embedding,
                        remaining_impressions,
                        active)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::vector, %s, %s)
                """, params=(article_id, title, description, tags, category, promoter_id, budget, boost, emb_sql, impressions, True))
                print(status)
                if status != 200:
                    logging.error(
                        f"Failed to insert vector embedding into the database."
                    )
                    raise Exception("Vector DB insertion failed")
                else:
                    logging.info(
                        f"Successfully processed and stored article")

            else:
                logging.warning(f"Could not extract content")
        else:
            logging.info(f"Skipping unverified article")

    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}")
        db_connection.rollback()
    else:
        db_connection.commit()
    finally:
        # Close the database connection
        close_connection(cur)
        close_connection(db_connection)


if __name__ == "__main__":

    # Configure logging for better debugging and monitoring
    logging.basicConfig(level=logging.INFO,
                        format='%(asctime)s - %(levelname)s - %(message)s')

    main(article_url="https://blogyworldaniket.blogspot.com/2025/08/androids-new-walls-deconstructing.html".strip(),
         verification_code="ef85f2ae-7b61-421d-a9e8-0c407e98e124",
         budget=1,
         promoter_id='01c1486c-9eb5-4ed9-aa06-2022e2c6e3ed'
         )
