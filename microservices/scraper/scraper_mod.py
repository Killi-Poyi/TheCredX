"""
scraper_mod.py

Provides the ScraperMod class for robustly scraping, cleaning, and uploading a single article.
"""

from dotenv import load_dotenv
from typing import Optional
import os
import requests
from bs4 import BeautifulSoup, FeatureNotFound
from requests.adapters import HTTPAdapter
import hashlib
from urllib3.util.retry import Retry
import boto3
from botocore.client import Config
import logging

logger = logging.getLogger(__name__)

load_dotenv()


class ScraperMod:
    """
    A robust web scraper to fetch, clean, and store a single article.

    Args:
        article_url (str): The article URL to scrape.
        verification_code (str): The code to verify article authenticity.
    """

    def __init__(self, article_url: str, verification_code: str):
        self.article_url = article_url
        self.verification_code = verification_code
        self.session = self._create_session()

    def _create_session(self) -> requests.Session:
        """
        Creates a requests.Session with a User-Agent and a retry strategy.

        Returns:
            requests.Session: Configured session object.
        """
        session = requests.Session()
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        session.headers.update(headers)

        retry_strategy = Retry(
            total=3,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["HEAD", "GET", "OPTIONS"],
            backoff_factor=1
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("https://", adapter)
        session.mount("http://", adapter)
        return session

    def fetch_article_html(self) -> Optional[BeautifulSoup]:
        """
        Fetches the HTML content of the article URL with timeouts and retries.

        Returns:
            Optional[BeautifulSoup]: Parsed HTML content, or None if fetch fails.
        """
        url = self.article_url
        try:
            resp = self.session.get(url, timeout=15)
            resp.raise_for_status()
            try:
                soup = BeautifulSoup(resp.content, 'lxml')
            except FeatureNotFound:
                logger.warning(
                    "lxml parser not found. Falling back to html.parser")
                soup = BeautifulSoup(resp.content, 'html.parser')
            logger.info(f"Fetched HTML for URL: {url}")
            return soup
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch {url}. Reason: {e}")
            return None
        except Exception as e:
            logger.error(
                f"An unexpected error occurred while fetching {url}: {e}")
            return None

    def has_credx_verification(self, soup: Optional[BeautifulSoup]) -> bool:
        """
        Checks for the presence of a 'credx-verification' meta tag.

        Args:
            soup (Optional[BeautifulSoup]): Parsed HTML content.

        Returns:
            bool: True if verification meta tag is present and correct, else False.
        """
        if soup is None:
            logger.warning("No soup object provided for verification.")
            return False

        meta = soup.find('meta', attrs={'name': 'credx-verification'})
        if not meta or meta.get('content') != self.verification_code:
            logger.info("Article verification failed.")
            return False

        logger.info("Article verification succeeded.")
        return meta is not None

    def scrape_and_clean_article(self, soup: Optional[BeautifulSoup]) -> str:
        """
        Scrapes and cleans the article content from the BeautifulSoup object.

        Args:
            soup (Optional[BeautifulSoup]): Parsed HTML content.

        Returns:
            str: Cleaned article text.
        """
        if soup is None:
            logger.warning("No soup object provided for cleaning.")
            return ''

        # Remove unwanted tags like scripts, styles, navs, etc.
        for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'form', 'iframe', 'noscript']):
            tag.decompose()

        # Remove comments
        for comment in soup.find_all(string=lambda text: isinstance(text, str) and '<!--' in text):
            comment.extract()

        # Remove elements with common ad or irrelevant classes/ids
        for bad_selector in soup.select('[id*="comments"], [class*="ad"], [id*="ad"], [class*="promo"], [class*="subscribe"], [class*="banner"], [class*="cookie"], [class*="social"], [class*="share"], [class*="popup"], [class*="sidebar"]'):
            bad_selector.decompose()

        # Prefer <article>, fallback to main content containers
        main_content = soup.find('article') or soup.find('main') or soup.body
        if not main_content:
            logger.warning("No main content found in article.")
            return ''

        # For better readability, replace block tags with newlines before getting text
        for tag in main_content.find_all(['p', 'div', 'br', 'h1', 'h2', 'h3', 'h4']):
            tag.append('\n')

        # Get cleaned text, strip leading/trailing whitespace from each line
        lines = (line.strip() for line in main_content.get_text().splitlines())
        text = '\n'.join(line for line in lines if line)
        logger.info("Article content cleaned successfully.")
        return text

    def generate_unique_identifier(self) -> str:
        """
        Generates a deterministic, unique, and filesystem-safe identifier from the article URL.

        Returns:
            str: SHA-256 hash of the URL.
        """
        url_bytes = self.article_url.encode('utf-8')
        sha256_hash = hashlib.sha256(url_bytes)
        identifier = sha256_hash.hexdigest()
        logger.debug(f"Generated unique identifier for URL: {identifier}")
        return identifier

    def upload_to_s3(self, content: str, bucket: str, object_name: str):
        """
        Uploads article content directly to an S3-compatible object store.

        Args:
            content (str): The article content to upload.
            bucket (str): The S3 bucket name.
            object_name (str): The object name (key) in the bucket.
        """
        import io
        endpoint_url = os.getenv('S3_ENDPOINT_URL')
        access_key = os.getenv('S3_ACCESS_KEY_ID')
        secret_key = os.getenv('S3_ACCESS_KEY')
        region = os.getenv("S3_REGION")

        if not all([endpoint_url, access_key, secret_key]):
            logger.error(
                "S3 credentials and endpoint URL must be set as environment variables.")
            return

        s3 = boto3.client('s3', endpoint_url=endpoint_url,
                          aws_access_key_id=access_key,
                          aws_secret_access_key=secret_key,
                          config=Config(region_name=region))
        try:
            s3.upload_fileobj(io.BytesIO(
                content.encode('utf-8')), bucket, object_name)
            logger.info(
                f"Successfully uploaded content to {bucket}/{object_name}")
        except Exception as e:
            logger.error(f"Failed to upload content to S3. Reason: {e}")

    def get_title_image(self, soup: Optional[BeautifulSoup]) -> str:
        """
        Extracts the main thumbnail image of the article.

        Args:
            soup (Optional[BeautifulSoup]): Parsed HTML content.

        Returns:
            str: Image URL or empty string if not found.
        """
        if soup is None:
            logger.info("No soup object provided for image extraction.")
            return ''

        # 1. Try <meta property="og:image"> (Open Graph)
        meta_og = soup.find('meta', property='og:image')
        if meta_og and meta_og.get('content'):
            logger.info("Found og:image meta tag for article image.")
            return meta_og['content'].strip()

        # 2. Try <meta name="twitter:image">
        meta_twitter = soup.find('meta', attrs={'name': 'twitter:image'})
        if meta_twitter and meta_twitter.get('content'):
            logger.info("Found twitter:image meta tag for article image.")
            return meta_twitter['content'].strip()

        # 3. Try <link rel="image_src">
        link_image_src = soup.find('link', rel='image_src')
        if link_image_src and link_image_src.get('href'):
            logger.info("Found image_src link tag for article image.")
            return link_image_src['href'].strip()

        # 4. Fallback: first <img> in <body>
        body = soup.body
        if body:
            first_img = body.find('img', src=True)
            if first_img and first_img['src']:
                logger.info("Found first <img> tag in article body for image.")
                return first_img['src'].strip()

        logger.info("No article image found.")
        return ''
