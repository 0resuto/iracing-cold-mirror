import json
import logging

import httpx

from telemetry.config import settings

logger = logging.getLogger(__name__)


def generate_coach_insights(
    track_name: str,
    car_name: str,
    lap_time: float,
    ref_lap_time: float,
    corners_data: list[dict],
) -> dict:
    """
    Sends synthesized physics telemetry metrics to LLM via OpenAI-compatible endpoint
    and returns structured race engineer feedback.
    """
    if not settings.llm_api_key or not settings.llm_api_key.strip():
        raise RuntimeError("LLM_API_KEY is not configured in .env")

    system_prompt = (
        "You are an elite GT3 / Formula Race Engineer and Telemetry Data Coach. "
        "Analyze driver telemetry data against the reference lap. "
        "Be concise, technical, and actionable. Focus on braking markers, apex speeds, and throttle pickup. "
        "Return strictly valid JSON matching this schema:\n"
        "{\n"
        '  "overall_score": number (0-100),\n'
        '  "summary": string (1-2 sentences),\n'
        '  "critical_mistakes": [{"corner": string, "description": string, "time_loss": number}],\n'
        '  "corner_analyses": [{"name": string, "time_loss": number, "brake_delta_m": number, "apex_speed_delta": number, "advice": string}]\n'
        "}"
    )

    user_content = json.dumps(
        {
            "track": track_name,
            "car": car_name,
            "lap_time": lap_time,
            "reference_lap_time": ref_lap_time,
            "time_delta_total": round(lap_time - ref_lap_time, 2),
            "corners": corners_data,
        }
    )

    endpoint_url = f"{settings.llm_base_url.rstrip('/')}/chat/completions"

    payload = {
        "model": settings.llm_model,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Lap comparison data:\n{user_content}"},
        ],
        "temperature": 0.2,
    }

    headers = {
        "Authorization": f"Bearer {settings.llm_api_key}",
        "Content-Type": "application/json",
    }

    with httpx.Client(timeout=20.0) as client:
        response = client.post(endpoint_url, json=payload, headers=headers)
        if response.status_code != 200:
            logger.error(f"LLM API request failed: {response.status_code} - {response.text}")
            raise RuntimeError(f"LLM API returned status {response.status_code}: {response.text}")

        data = response.json()
        raw_text = data["choices"][0]["message"]["content"].strip()

        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[-1]
            if raw_text.rfind("```") != -1:
                raw_text = raw_text[: raw_text.rfind("```")].strip()

        result = json.loads(raw_text)
        result["model_name"] = settings.llm_model
        return result
