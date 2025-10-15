from flask import Flask
from flask_login import LoginManager
from flask_migrate import Migrate
from config import Config

# Initialize extensions
from models import db
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
    from routes.admin import admin_bp
    from routes.seller import seller_bp
    from routes.request import request_bp
    from routes.dealer import dealer_bp
    from routes.rentals import rentals_bp

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(main_bp)
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(auctions_bp, url_prefix='/auctions')
    app.register_blueprint(seller_bp, url_prefix='/seller')
    app.register_blueprint(request_bp)
    app.register_blueprint(dealer_bp)
    app.register_blueprint(rentals_bp)

    # Define user loader function for Flask-Login
    from models.user import User
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # Make 'now' available to all templates
    @app.context_processor
    def inject_now():
        from datetime import datetime
        from models.notification import Notification
        from flask_login import current_user
        unread_notifications = 0
        if current_user.is_authenticated:
            unread_notifications = Notification.query.filter_by(user_id=current_user.id, is_read=False).count()
        return {'now': datetime.utcnow(), 'unread_notifications': unread_notifications}

    # CLI command to create an admin user
    @app.cli.command("create-admin")
    def create_admin():
        """Creates a new admin user."""
        from models.user import User
        username = input("Enter admin username: ")
        email = input("Enter admin email: ")
        password = input("Enter admin password: ")
        user = User(username=username, email=email, is_admin=True)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        print(f"Admin user {username} created successfully.")

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)
