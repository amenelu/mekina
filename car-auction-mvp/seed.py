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
            # Existing Cars
            {'make': 'Toyota', 'model': 'Corolla', 'year': 2019, 'description': 'A reliable and fuel-efficient sedan.', 'owner_id': owner.id, 'is_approved': False, 'start_price': 1200000.00, 'transmission': 'Automatic', 'drivetrain': 'FWD', 'mileage': 50000, 'fuel_type': 'Gasoline'},
            {'make': 'Ford', 'model': 'Ranger', 'year': 2021, 'description': 'Tough and capable pickup truck.', 'owner_id': owner.id, 'is_approved': True, 'start_price': 2500000.00, 'transmission': 'Automatic', 'drivetrain': '4WD', 'mileage': 30000, 'fuel_type': 'Diesel'},
            {'make': 'Volkswagen', 'model': 'ID.4', 'year': 2022, 'description': 'Modern electric SUV with great range.', 'owner_id': owner.id, 'is_approved': True, 'start_price': 3500000.00, 'transmission': 'Automatic', 'drivetrain': 'AWD', 'mileage': 15000, 'fuel_type': 'Electric'},
            {'make': 'Lifan', 'model': '530', 'year': 2018, 'description': 'An affordable compact car.', 'owner_id': owner.id, 'is_approved': True, 'start_price': 850000.00, 'transmission': 'Manual', 'drivetrain': 'FWD', 'mileage': 85000, 'fuel_type': 'Gasoline'},

            # 20 More Cars
            {'make': 'Toyota', 'model': 'Vitz', 'year': 2017, 'description': 'Compact and easy to park.', 'owner_id': owner.id, 'is_approved': False, 'start_price': 950000.00, 'transmission': 'Automatic', 'drivetrain': 'FWD', 'mileage': 75000, 'fuel_type': 'Gasoline'},
            {'make': 'Toyota', 'model': 'Hilux', 'year': 2018, 'description': 'Legendary and unbreakable pickup.', 'owner_id': owner.id, 'is_approved': False, 'start_price': 2800000.00, 'transmission': 'Manual', 'drivetrain': '4WD', 'mileage': 110000, 'fuel_type': 'Diesel'},
            {'make': 'Toyota', 'model': 'Yaris', 'year': 2020, 'description': 'A stylish and modern compact sedan.', 'owner_id': owner.id, 'is_approved': True, 'start_price': 1400000.00, 'transmission': 'Automatic', 'drivetrain': 'FWD', 'mileage': 40000, 'fuel_type': 'Gasoline'},
            {'make': 'Hyundai', 'model': 'Tucson', 'year': 2019, 'description': 'A comfortable and feature-packed SUV.', 'owner_id': owner.id, 'is_approved': True, 'start_price': 2200000.00, 'transmission': 'Automatic', 'drivetrain': 'AWD', 'mileage': 60000, 'fuel_type': 'Gasoline'},
            {'make': 'Suzuki', 'model': 'Dzire', 'year': 2021, 'description': 'Extremely fuel-efficient and practical.', 'owner_id': owner.id, 'is_approved': True, 'start_price': 1300000.00, 'transmission': 'Manual', 'drivetrain': 'FWD', 'mileage': 25000, 'fuel_type': 'Gasoline'},
            {'make': 'Toyota', 'model': 'Land Cruiser', 'year': 2016, 'description': 'The king of off-road. Ready for any adventure.', 'owner_id': owner.id, 'is_approved': True, 'start_price': 4500000.00, 'transmission': 'Automatic', 'drivetrain': '4WD', 'mileage': 150000, 'fuel_type': 'Diesel'},
            {'make': 'Mercedes-Benz', 'model': 'C-Class', 'year': 2018, 'description': 'Luxury and performance in one package.', 'owner_id': owner.id, 'is_approved': True, 'start_price': 3200000.00, 'transmission': 'Automatic', 'drivetrain': 'RWD', 'mileage': 70000, 'fuel_type': 'Gasoline'},
            {'make': 'Honda', 'model': 'CR-V', 'year': 2017, 'description': 'A spacious and reliable family SUV.', 'owner_id': owner.id, 'is_approved': True, 'start_price': 1900000.00, 'transmission': 'Automatic', 'drivetrain': 'AWD', 'mileage': 90000, 'fuel_type': 'Gasoline'},
            {'make': 'Nissan', 'model': 'Qashqai', 'year': 2019, 'description': 'A popular and stylish crossover.', 'owner_id': owner.id, 'is_approved': True, 'start_price': 2100000.00, 'transmission': 'Automatic', 'drivetrain': 'FWD', 'mileage': 55000, 'fuel_type': 'Gasoline'},
            {'make': 'Kia', 'model': 'Sportage', 'year': 2020, 'description': 'Bold design with modern technology.', 'owner_id': owner.id, 'is_approved': True, 'start_price': 2300000.00, 'transmission': 'Automatic', 'drivetrain': 'AWD', 'mileage': 45000, 'fuel_type': 'Gasoline'},
            {'make': 'BYD', 'model': 'Dolphin', 'year': 2023, 'description': 'A brand new, affordable electric car.', 'owner_id': owner.id, 'is_approved': True, 'start_price': 2800000.00, 'transmission': 'Automatic', 'drivetrain': 'FWD', 'mileage': 5000, 'fuel_type': 'Electric'},
            {'make': 'Toyota', 'model': 'RAV4', 'year': 2018, 'description': 'Versatile and capable SUV for city and country.', 'owner_id': owner.id, 'is_approved': True, 'start_price': 2600000.00, 'transmission': 'Automatic', 'drivetrain': 'AWD', 'mileage': 80000, 'fuel_type': 'Gasoline'},
            {'make': 'Peugeot', 'model': '3008', 'year': 2019, 'description': 'A French SUV with a unique and premium interior.', 'owner_id': owner.id, 'is_approved': True, 'start_price': 2400000.00, 'transmission': 'Automatic', 'drivetrain': 'FWD', 'mileage': 65000, 'fuel_type': 'Diesel'},
            {'make': 'Isuzu', 'model': 'D-Max', 'year': 2020, 'description': 'A workhorse pickup known for its durability.', 'owner_id': owner.id, 'is_approved': True, 'start_price': 2700000.00, 'transmission': 'Manual', 'drivetrain': '4WD', 'mileage': 95000, 'fuel_type': 'Diesel'},
            {'make': 'Hyundai', 'model': 'Creta', 'year': 2021, 'description': 'A compact SUV with a comfortable ride.', 'owner_id': owner.id, 'is_approved': True, 'start_price': 1800000.00, 'transmission': 'Automatic', 'drivetrain': 'FWD', 'mileage': 35000, 'fuel_type': 'Gasoline'},
            {'make': 'Volkswagen', 'model': 'Polo', 'year': 2017, 'description': 'A solid and well-built hatchback.', 'owner_id': owner.id, 'is_approved': True, 'start_price': 1100000.00, 'transmission': 'Manual', 'drivetrain': 'FWD', 'mileage': 120000, 'fuel_type': 'Gasoline'},
            {'make': 'Ford', 'model': 'Everest', 'year': 2019, 'description': 'A large, family-friendly SUV based on the Ranger.', 'owner_id': owner.id, 'is_approved': True, 'start_price': 3100000.00, 'transmission': 'Automatic', 'drivetrain': '4WD', 'mileage': 88000, 'fuel_type': 'Diesel'},
            {'make': 'Mazda', 'model': 'CX-5', 'year': 2018, 'description': 'A stylish and fun-to-drive crossover.', 'owner_id': owner.id, 'is_approved': True, 'start_price': 2350000.00, 'transmission': 'Automatic', 'drivetrain': 'AWD', 'mileage': 72000, 'fuel_type': 'Gasoline'},
            {'make': 'Subaru', 'model': 'Forester', 'year': 2019, 'description': 'Symmetrical All-Wheel Drive for superior handling.', 'owner_id': owner.id, 'is_approved': True, 'start_price': 2450000.00, 'transmission': 'Automatic', 'drivetrain': 'AWD', 'mileage': 68000, 'fuel_type': 'Gasoline'},
            {'make': 'Renault', 'model': 'Duster', 'year': 2020, 'description': 'A rugged and affordable small SUV.', 'owner_id': owner.id, 'is_approved': True, 'start_price': 1500000.00, 'transmission': 'Manual', 'drivetrain': 'FWD', 'mileage': 48000, 'fuel_type': 'Gasoline'},
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
        print("Several cars were created as unapproved for testing the admin approval workflow.")