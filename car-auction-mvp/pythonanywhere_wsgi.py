import os
import sys

from dotenv import load_dotenv


project_home = os.environ.get("MEKINA_PROJECT_HOME", os.path.dirname(__file__))

if project_home not in sys.path:
    sys.path.insert(0, project_home)

load_dotenv(os.path.join(project_home, ".env"))

from app import create_app  # noqa: E402


application = create_app()
