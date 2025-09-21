from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_migrate import Migrate
from config import Config

# Initialize extensions
db = SQLAlchemy()
login_manager = LoginManager()
login_manager.login_view = 'auth.login' # Redirect to login page if user is not authenticated
migrate = Migrate()

def create_app(config_class=Config):
    """Create and configure an instance of the Flask application."""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize Flask extensions here
    db.init_app(app)
    login_manager.init_app(app)
    migrate.init_app(app, db)

    # Register blueprints here
    from routes.auth import auth_bp
    from routes.main import main_bp
    from routes.auctions import auctions_bp

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(main_bp)
    app.register_blueprint(auctions_bp, url_prefix='/auctions')

    # Define user loader function for Flask-Login
    from models.user import User
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    with app.app_context():
        # You can create all tables here if not using migrations
        # db.create_all()
        pass

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)
