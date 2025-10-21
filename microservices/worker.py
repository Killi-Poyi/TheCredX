# filename: worker.py
from sentence_transformers import SentenceTransformer
import os
import logging
from controller.db_controller import make_connection, close_connection, execute_query
from dotenv import load_dotenv

load_dotenv()

def main():
    db_connection = None
    cur = None
    try:
        logging.info("Starting embedding worker...")
        db_connection = make_connection()
        cur = db_connection.cursor()

        # 1. Load Embedding Model (only once)
        embedder = SentenceTransformer("./sentence-t5-base-local")
        logging.info("Model loaded.")

        # 2. Find "Jobs" to do (the trigger)
        # We find all promotions that are NOT active and have NO embedding
        jobs_to_do = execute_query(
            cursor=cur,
            query="""
                SELECT id, article_id 
                FROM promotions 
                WHERE embedding IS NULL AND active = false
            """,
            fetch=True
        )

        if not jobs_to_do:
            logging.info("No new jobs found.")
            return

        logging.info(f"Found {len(jobs_to_do)} jobs to process.")

        # 3. Process Each Job
        for job in jobs_to_do:
            promotion_id, article_id = job
            logging.info(f"Processing promotion_id: {promotion_id} for article_id: {article_id}")

            try:
                # 4. Get article text from content_items
                article_data = execute_query(
                    cursor=cur,
                    query="SELECT title, description, tags, category FROM content_items WHERE content_id = %s",
                    params=(article_id,),
                    fetch=True
                )
                
                if not article_data:
                    logging.error(f"Could not find content for {article_id}. Skipping.")
                    continue

                title, description, tags, category = article_data[0]
                
                # 5. Generate Embedding
                text_to_embed = f"{title} {description} {' '.join(tags)}"
                emb = embedder.encode(text_to_embed, normalize_embeddings=True)
                emb_sql = "[" + ",".join([str(x) for x in emb.tolist()]) + "]"

                # 6. UPDATE the record (the final step)
                update_status = execute_query(
                    cursor=cur,
                    query="""
                        UPDATE promotions 
                        SET 
                            title = %s,
                            summary = %s,
                            tags = %s,
                            categories = %s,
                            embedding = %s::vector,
                            active = %s
                        WHERE 
                            id = %s
                    """,
                    params=(
                        title,
                        description,
                        tags,
                        category,
                        emb_sql,
                        True,  # Set active = true!
                        promotion_id
                    )
                )

                if update_status == 200:
                    logging.info(f"Successfully updated promotion_id: {promotion_id}")
                    db_connection.commit()
                else:
                    logging.error(f"Failed to update promotion_id: {promotion_id}")
                    db_connection.rollback()

            except Exception as e:
                logging.error(f"Error processing job {promotion_id}: {e}")
                db_connection.rollback()

    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}")
    finally:
        if cur: close_connection(cur)
        if db_connection: close_connection(db_connection)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    main()