"""
gemini.py

This module provides a client interface for Google's Gemini generative AI API.
It allows for text generation using the Gemini model, with configuration for API key management
and model selection.

Functions:
----------
- create_gemini_client(): Initializes and returns a Gemini API client using the API key from environment variables.
- generate_text(client, prompt, model): Generates text from a prompt using the specified Gemini model.

Usage:
------
Set the GEMINI_API_KEY environment variable before running this script.
Example:
    client = create_gemini_client()
    summary = generate_text(client, prompt="Your prompt here")
"""

import os

from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load environment variables from .env
load_dotenv()

# Fetch variables
API_KEY = os.getenv("GEMINI_API_KEY", None)


def create_gemini_client():
    """
    Initializes and returns a Gemini API client using the API key from environment variables.

    Returns:
        genai.Client: An authenticated Gemini API client.

    Raises:
        ValueError: If the GEMINI_API_KEY environment variable is not set.
    """
    if API_KEY is None:
        raise ValueError("GEMINI_API_KEY environment variable not set")

    client = genai.Client(api_key=API_KEY)

    return client


def generate_text(client, prompt, model="gemini-2.5-flash", ):
    """
    Generates text from a prompt using the specified Gemini model.

    Args:
        client (genai.Client): The Gemini API client.
        prompt (str): The prompt or context for text generation.
        model (str): The Gemini model to use (default: "gemini-2.5-flash").

    Returns:
        str: The generated text response.
    """
    response = client.models.generate_content(
        model=model, contents=prompt,
        config=types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(
                thinking_budget=0)  # Disables thinking
        ),
    )
    return response.text


if __name__ == "__main__":
    """
    Example usage: Generates a short blog post summary from a file using the Gemini API.
    """
    client = create_gemini_client()

    context = open(
        r"./articles/737579b091829f1d75321fd4c68f1046f52c41b44c00ea935579e23427ecfc8c.txt", 'r').read()

    prompt = f"""Generate a very short blog post summary in 80 words or less from the below context, make sure it is super interesting such that it compels the user to click and read the full article. output should be in plain text only Context: {context}"""

    print(generate_text(client, prompt=prompt))
