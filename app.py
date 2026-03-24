from flask import jsonify

from backend.app import app


@app.route("/", methods=["GET"])
def health():
    return jsonify(
        {
            "message": "API is running",
            "endpoints": ["/predict", "/stats", "/bulk_predict"],
        }
    ), 200
