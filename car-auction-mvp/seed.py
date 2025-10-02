from app import create_app, db
from models.user import User
from models.car import Car
from models.auction import Auction
from datetime import datetime, timedelta

app = create_app()

with app.app_context():
    # Clean up old data
    print("Clearing old data...")
    Auction.query.delete()
    Car.query.delete()
    db.session.commit()

    # Find a user to be the owner of the cars. Let's use the first user.
    # Make sure you have created at least one user via the web UI or the create-admin command.
    owner = User.query.first()

    if not owner:
        print("No users found in the database. Please create a user first.")
        print("You can run 'flask create-admin' or register a user through the web interface.")
    else:
        print(f"Using user '{owner.username}' as the owner for new cars.")

        # --- Car and Auction Data ---
        cars_to_add = [
            {'make': 'Toyota', 'model': 'Corolla', 'year': 2019, 'description': 'A reliable and fuel-efficient sedan.', 'owner_id': owner.id, 'is_approved': False, 'start_price': 1200000.00},
            {'make': 'Ford', 'model': 'Ranger', 'year': 2021, 'description': 'Tough and capable pickup truck.', 'owner_id': owner.id, 'is_approved': True, 'start_price': 2500000.00},
            {'make': 'Volkswagen', 'model': 'ID.4', 'year': 2022, 'description': 'Modern electric SUV with great range.', 'owner_id': owner.id, 'is_approved': True, 'start_price': 3500000.00},
            {'make': 'Lifan', 'model': '530', 'year': 2018, 'description': 'An affordable compact car.', 'owner_id': owner.id, 'is_approved': True, 'start_price': 850000.00},
        ]

        for car_data in cars_to_add:
            start_price = car_data.pop('start_price')
            
            # Create Car
            new_car = Car(**car_data)
            db.session.add(new_car)
            db.session.commit() # Commit to get the car ID

            # Create Auction for the Car
            new_auction = Auction(
                start_time=datetime.utcnow(),
                end_time=datetime.utcnow() + timedelta(days=7),
                start_price=start_price,
                current_price=start_price,
                car_id=new_car.id
            )
            db.session.add(new_auction)
            print(f"Created car and auction for: {new_car.year} {new_car.make} {new_car.model}")

        db.session.commit()
        print("\nDatabase seeding complete!")
        print("One car ('2019 Toyota Corolla') was created as unapproved for testing the admin approval workflow.")