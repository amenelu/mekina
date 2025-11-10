from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify, current_app
from flask_login import login_user, logout_user, current_user
from werkzeug.urls import url_parse
from sqlalchemy import or_
from extensions import db
from models.user import User
import jwt
from datetime import datetime, timedelta
from functools import wraps
from werkzeug.security import check_password_hash
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, BooleanField, SubmitField
from wtforms.validators import DataRequired, Email, EqualTo, ValidationError, Optional

auth_bp = Blueprint('auth', __name__)

class LoginForm(FlaskForm):
    login = StringField('Username or Email', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    remember_me = BooleanField('Remember Me')
    submit = SubmitField('Sign In')

class RegistrationForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    email = StringField('Email', validators=[DataRequired(), Email()])
    phone_number = StringField('Phone Number', validators=[Optional()])
    password = PasswordField('Password', validators=[DataRequired()])
    password2 = PasswordField('Repeat Password', validators=[DataRequired(), EqualTo('password')])
    submit = SubmitField('Register')

    def validate_username(self, username):
        user = User.query.filter_by(username=username.data).first()
        if user is not None:
            raise ValidationError('Please use a different username.')

    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if user is not None:
            raise ValidationError('Please use a different email address.')

def generate_jwt(user):
    """Generates a JWT for the given user."""
    expiration_time = datetime.utcnow() + timedelta(hours=1)  # Token valid for 1 hour
    payload = {
        'user_id': user.id,
        'exp': expiration_time
    }
    token = jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')
    return token

def verify_jwt(token):
    """Verifies the JWT and returns the user if valid."""
    try:
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        user_id = payload.get('user_id')
        user = User.query.get(user_id)
        return user
    except jwt.ExpiredSignatureError:
        return None  # Token has expired
    except jwt.InvalidTokenError:
        return None  # Invalid token

def token_required(f):
    """Decorator to protect API endpoints with JWT."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        # JWT is typically passed in the header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except:
                return jsonify({'message': 'Malformed authorization header!'}), 400

        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        user = verify_jwt(token)
        if not user:
            return jsonify({'message': 'Token is invalid!'}), 401
        return f(current_user=user, *args, **kwargs)
    return decorated_function
@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('main.home'))
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter(
            or_(User.username == form.login.data, User.email == form.login.data)
        ).first()
        if user is None or not user.check_password(form.password.data):
            flash('Invalid username/email or password', 'danger')
            return redirect(url_for('auth.login'))
        
        login_user(user, remember=form.remember_me.data)
        
        next_page = request.args.get('next')
        if not next_page or url_parse(next_page).netloc != '':
            # --- THIS IS THE FIX ---
            # Redirect users to their specific dashboards
            if current_user.is_admin:
                next_page = url_for('admin.dashboard')
            elif current_user.is_rental_company:
                next_page = url_for('rentals.dashboard')
            elif current_user.is_dealer:
                next_page = url_for('dealer.dashboard')
            else:
                next_page = url_for('main.home')        
        return redirect(next_page)
    return render_template('login.html', title='Sign In', form=form)

@auth_bp.route('/api/login', methods=['POST'])
def api_login():
    """API endpoint for user login and JWT generation."""
    data = request.get_json()
    if not data or not data.get('login') or not data.get('password'):
        return jsonify({'message': 'Please provide username/email and password'}), 400

    user = User.query.filter(
        or_(User.username == data['login'], User.email == data['login'])
    ).first()

    if not user or not check_password_hash(user.password_hash, data['password']):
        return jsonify({'message': 'Invalid credentials'}), 401

    token = generate_jwt(user)
    return jsonify({'token': token, 'user_id': user.id}), 200


@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('main.home'))
    form = RegistrationForm()
    if form.validate_on_submit():
        user = User(username=form.username.data, email=form.email.data, phone_number=form.phone_number.data)
        user.set_password(form.password.data)
        db.session.add(user)
        db.session.commit()
        flash('Congratulations, you are now a registered user!')
        return redirect(url_for('auth.login'))
    return render_template('register.html', title='Register', form=form)

@auth_bp.route('/api/register', methods=['POST'])
def api_register(): # Removed the extra redirect and render_template lines
    """API endpoint for user registration."""
    data = request.get_json()
    errors = {}

    # Basic presence validation
    if not data:
        return jsonify({'message': 'Invalid JSON payload'}), 400
    if not data.get('username'):
        errors['username'] = 'Username is required.'
    if not data.get('email'):
        errors['email'] = 'Email is required.'
    if not data.get('password'):
        errors['password'] = 'Password is required.'
    if not data.get('password2'):
        errors['password2'] = 'Repeat Password is required.'

    # Password match validation
    if data.get('password') != data.get('password2'):
        errors['password2'] = 'Passwords must match.'

    # Uniqueness validation
    if data.get('username') and User.query.filter_by(username=data['username']).first():
        errors['username'] = 'Please use a different username.'
    if data.get('email') and User.query.filter_by(email=data['email']).first():
        errors['email'] = 'Please use a different email address.'

    if errors:
        return jsonify({'message': 'Validation failed', 'errors': errors}), 400

    # Create new user
    user = User(
        username=data['username'],
        email=data['email'],
        phone_number=data.get('phone_number')
    )
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()

    return jsonify({'message': 'Registration successful', 'user_id': user.id}), 201


@auth_bp.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('main.home'))
