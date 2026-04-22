from app import create_app
from extensions import socketio
import os

app = create_app()

if __name__ == "__main__":
    socketio.run(
        app,
        debug=app.config.get("FLASK_DEBUG", False),
        host=os.environ.get("HOST", "0.0.0.0"),
        port=int(os.environ.get("PORT", 5001)),
    )
