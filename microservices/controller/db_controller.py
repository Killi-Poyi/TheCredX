import psycopg2
from psycopg2 import connect
from dotenv import load_dotenv
import logging
import os

# Load environment variables from .env
load_dotenv()

# Fetch variables
USER = os.getenv("DB_USER")
PASSWORD = os.getenv("DB_PASSWORD")
HOST = os.getenv("DB_HOST")
PORT = os.getenv("DB_PORT")
DBNAME = os.getenv("DB_NAME")

logger = logging.getLogger(__name__)


# def make_connection():

#     """
#     Connect to the PostgreSQL database using credentials from environment variables.
#     Returns the connection object if successful, else raises an exception.
#     """
#     # Connect to the database
#     try:
        
#         connection = connect(
#             user=USER,
#             password=PASSWORD,
#             host=HOST,
#             port=PORT,
#             dbname=DBNAME
#         )
        
#         logger.info("Connection successful!")
#         return connection
#     except Exception as e:
#         logger.error(f"Failed to connect: {e}")
#         return None

def make_connection():
    """
    Connect to the PostgreSQL database using the DATABASE_URL environment variable.
    Returns the connection object if successful, else returns None.
    """
    conn = None
    try:
        # --- THIS IS THE FIX ---
        # Get the full connection string from the ONE environment variable
        # provided by GitHub Actions (and also defined in your .env for local use)
        database_url = os.environ.get('DATABASE_URL') 
        
        if not database_url:
            logger.error("DATABASE_URL environment variable not set.")
            return None     

        logger.info("Attempting to connect to the database using DATABASE_URL...")
        
        conn = psycopg2.connect(database_url) 
        logger.info("Database connection successful!")
        return conn
        
    except Exception as e:
        logger.error(f"Failed to connect: {e}")
        return None 


def close_connection(connection):
    """
    Close the given database connection.
    """
    if connection:
        connection.close()
        logger.info("Connection closed.")


def execute_query(cursor, query, params, fetch=False) -> int:
    """
    Executes a given SQL query using the provided database cursor.

    Args:
        cursor: A database cursor object used to execute the query.
        query (str): The SQL query to be executed.
        params (tuple or dict): Parameters to be passed with the SQL query.
        fetch (bool, optional): If True, fetches and returns a single result from the query. Defaults to False.

    Returns:
        int or Any:
            - If fetch is False: Returns 200 on success, 500 on failure.
            - If fetch is True: Returns the fetched result on success, 500 on failure.

    Logs:
        - Logs an error message if query execution fails.
        - Logs an info message if query execution succeeds.
    """
    try:
        if params:
            cursor.execute(query, params)
            if fetch:
                result = cursor.fetchone()
                return result
        else:
            cursor.execute(query)
    except Exception as e:
        logger.error(f"Query execution failed: {e}")
        return 500
    else:
        logger.info("Query executed successfully!")
        return 200
