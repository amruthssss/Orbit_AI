import json

from google import genai
from app.config import GEMINI_API_KEY, settings


client = genai.Client(
    api_key=GEMINI_API_KEY
)


EVALUATOR_MODEL = settings.gemini_model


def evaluate_answer(
    question: str,
    expected_answer: str,
    actual_answer: str
):

    prompt = f"""
You are an evaluator for an AI chatbot.

Evaluate the chatbot answer.

Question:
{question}

Expected Answer:
{expected_answer}

Actual Answer:
{actual_answer}

Evaluate the actual answer on:

1. Correctness
2. Relevance
3. Instruction following

Give each score from 1 to 5.

Return ONLY valid JSON in this format:

{{
    "correctness": 0,
    "relevance": 0,
    "instruction_following": 0,
    "reason": "short explanation"
}}
"""

    response = client.models.generate_content(
        model=EVALUATOR_MODEL,
        contents=prompt,
        config={
            "response_mime_type": "application/json"
        }
    )        

    return json.loads(response.text)