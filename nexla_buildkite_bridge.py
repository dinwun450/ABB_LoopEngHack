"""
Minimal bridge server: receives Nexla's webhook POST (raw Nexset rows, or a
custom payload if you configured one) and re-emits a correctly-shaped
"Create a Build" call to the Buildkite API.

Run locally for the hackathon:
    pip install flask requests
    export BUILDKITE_API_TOKEN=...        # token with build-write scope
    export BUILDKITE_ORG=your-org-slug
    export BUILDKITE_PIPELINE_SLUG=your-pipeline-slug
    export BRIDGE_SHARED_SECRET=some-random-string   # simple auth check
    python nexla_buildkite_bridge.py

Then expose it publicly for Nexla to reach (ngrok is the fastest option
during a hackathon):
    ngrok http 5000
Point Nexla's REST API destination at:
    https://<your-ngrok-subdomain>.ngrok.io/nexla-webhook
    with header  X-Bridge-Secret: <same value as BRIDGE_SHARED_SECRET>
"""

import os
import time

import requests
from flask import Flask, jsonify, request

app = Flask(__name__)

BUILDKITE_API_TOKEN = os.environ["BUILDKITE_API_TOKEN"]
BUILDKITE_ORG = os.environ["BUILDKITE_ORG"]
BUILDKITE_PIPELINE_SLUG = os.environ["BUILDKITE_PIPELINE_SLUG"]
BRIDGE_SHARED_SECRET = os.environ.get("BRIDGE_SHARED_SECRET")  # optional but recommended

# Where the cleaned dataset actually lives — set this to match whatever
# destination Nexla writes the clean Nexset to (S3 path, warehouse table, etc).
# If Nexla's payload includes this itself, prefer reading it from the payload
# instead of a fixed env var.
DEFAULT_DATASET_PATH = os.environ.get("DATASET_PATH", "s3://your-bucket/loan_applications_clean.csv")

BUILDKITE_BUILDS_URL = (
    f"https://api.buildkite.com/v2/organizations/{BUILDKITE_ORG}"
    f"/pipelines/{BUILDKITE_PIPELINE_SLUG}/builds"
)


@app.route("/health", methods=["GET"])
def health():
    return jsonify(status="ok"), 200


@app.route("/nexla-webhook", methods=["POST"])
def nexla_webhook():
    if BRIDGE_SHARED_SECRET and request.headers.get("X-Bridge-Secret") != BRIDGE_SHARED_SECRET:
        return jsonify(error="unauthorized"), 401

    payload = request.get_json(silent=True) or {}

    # Nexla's REST destination may send a list of rows, a wrapped object, or
    # whatever mapping you configured. Handle the common shapes defensively.
    rows = payload if isinstance(payload, list) else payload.get("records", payload.get("data", []))
    row_count = len(rows) if isinstance(rows, list) else payload.get("row_count", "unknown")

    dataset_path = payload.get("dataset_path", DEFAULT_DATASET_PATH)

    build_body = {
        "commit": "HEAD",
        "branch": "main",
        "message": f"Triggered by Nexla ingestion at {int(time.time())}",
        "meta_data": {
            "dataset_path": dataset_path,
            "row_count": str(row_count),
            "source": "nexla",
            "iteration": "1",
        },
    }

    resp = requests.post(
        BUILDKITE_BUILDS_URL,
        json=build_body,
        headers={"Authorization": f"Bearer {BUILDKITE_API_TOKEN}"},
        timeout=10,
    )

    if not resp.ok:
        return jsonify(error="buildkite_trigger_failed", detail=resp.text), 502

    build_info = resp.json()
    return jsonify(status="triggered", build_url=build_info.get("web_url")), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
