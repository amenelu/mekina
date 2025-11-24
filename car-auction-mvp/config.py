import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()
print("DEBUG SECRET:", os.environ.get("SECRET_KEY"))

basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    """Set Flask configuration variables from .env file."""

    # General Config
    SECRET_KEY = os.environ.get('SECRET_KEY')
    FLASK_APP = os.environ.get('FLASK_APP')
    
    # Convert string from .env to boolean
    FLASK_DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() in ('true', '1', 't')

    # Database
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///' + os.path.join(basedir, 'database.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
