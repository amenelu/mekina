from app import create_app, db
from models.user import User
from models.car import Car
from models.auction import Auction
from datetime import datetime, timedelta
from models.rental_listing import RentalListing

app = create_app()

with app.app_context():
    # Clean up old data
    print("Clearing old data...")
    Auction.query.delete()
    RentalListing.query.delete()
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
        # A diverse list of cars to populate the database for testing.
        # Includes a mix of approved and unapproved cars.
        cars_to_add = [
            # --- Unapproved for testing (as auctions) ---
            {'make': 'Toyota', 'model': 'Corolla', 'year': 2019, 'description': 'A reliable and fuel-efficient sedan.', 'owner_id': owner.id, 'is_approved': False, 'listing_type': 'auction', 'price': 1200000.00, 'transmission': 'Automatic', 'drivetrain': 'FWD', 'mileage': 50000, 'fuel_type': 'Gasoline', 'condition': 'Used', 'body_type': 'Sedan'},
            {'make': 'Toyota', 'model': 'Vitz', 'year': 2017, 'description': 'Compact and easy to park, perfect for city driving.', 'owner_id': owner.id, 'is_approved': False, 'listing_type': 'auction', 'price': 950000.00, 'transmission': 'Automatic', 'drivetrain': 'FWD', 'mileage': 75000, 'fuel_type': 'Gasoline', 'condition': 'Used', 'body_type': 'Hatchback'},
            
            # --- Approved and ready for listing ---
            # Auctions
            {'make': 'Ford', 'model': 'Ranger', 'year': 2021, 'description': 'Tough and capable pickup truck.', 'owner_id': owner.id, 'is_approved': True, 'listing_type': 'auction', 'price': 2500000.00, 'transmission': 'Automatic', 'drivetrain': '4WD', 'mileage': 30000, 'fuel_type': 'Diesel', 'condition': 'Used', 'body_type': 'Pickup'},
            {'make': 'Volkswagen', 'model': 'ID.4', 'year': 2022, 'description': 'Modern electric SUV with great range.', 'owner_id': owner.id, 'is_approved': True, 'listing_type': 'auction', 'price': 3500000.00, 'transmission': 'Automatic', 'drivetrain': 'AWD', 'mileage': 15000, 'fuel_type': 'Electric', 'condition': 'Used', 'body_type': 'SUV'},
            {'make': 'Lifan', 'model': '530', 'year': 2018, 'description': 'An affordable compact car.', 'owner_id': owner.id, 'is_approved': True, 'listing_type': 'auction', 'price': 850000.00, 'transmission': 'Manual', 'drivetrain': 'FWD', 'mileage': 85000, 'fuel_type': 'Gasoline', 'condition': 'Used', 'body_type': 'Sedan'},
            {'make': 'Toyota', 'model': 'Yaris', 'year': 2020, 'description': 'A stylish and modern compact sedan.', 'owner_id': owner.id, 'is_approved': True, 'listing_type': 'auction', 'price': 1400000.00, 'transmission': 'Automatic', 'drivetrain': 'FWD', 'mileage': 40000, 'fuel_type': 'Gasoline', 'condition': 'Used', 'body_type': 'Sedan'},
            {'make': 'Hyundai', 'model': 'Tucson', 'year': 2019, 'description': 'A comfortable and feature-packed SUV.', 'owner_id': owner.id, 'is_approved': True, 'listing_type': 'auction', 'price': 2200000.00, 'transmission': 'Automatic', 'drivetrain': 'AWD', 'mileage': 60000, 'fuel_type': 'Gasoline', 'condition': 'Used', 'body_type': 'SUV'},
            {'make': 'Suzuki', 'model': 'Dzire', 'year': 2021, 'description': 'Extremely fuel-efficient and practical.', 'owner_id': owner.id, 'is_approved': True, 'listing_type': 'auction', 'price': 1300000.00, 'transmission': 'Manual', 'drivetrain': 'FWD', 'mileage': 25000, 'fuel_type': 'Gasoline', 'condition': 'Used', 'body_type': 'Sedan'},
            
            # For Sale (Fixed Price)
            {'make': 'Toyota', 'model': 'Land Cruiser', 'year': 2016, 'description': 'The king of off-road. Ready for any adventure.', 'owner_id': owner.id, 'is_approved': True, 'listing_type': 'sale', 'price': 4800000.00, 'transmission': 'Automatic', 'drivetrain': '4WD', 'mileage': 150000, 'fuel_type': 'Diesel', 'condition': 'Used', 'body_type': 'SUV'},
            {'make': 'Mercedes-Benz', 'model': 'C-Class', 'year': 2018, 'description': 'Luxury and performance in one package.', 'owner_id': owner.id, 'is_approved': True, 'listing_type': 'sale', 'price': 3450000.00, 'transmission': 'Automatic', 'drivetrain': 'RWD', 'mileage': 70000, 'fuel_type': 'Gasoline', 'condition': 'Used', 'body_type': 'Sedan'},
            {'make': 'Honda', 'model': 'CR-V', 'year': 2017, 'description': 'A spacious and reliable family SUV.', 'owner_id': owner.id, 'is_approved': True, 'listing_type': 'sale', 'price': 2100000.00, 'transmission': 'Automatic', 'drivetrain': 'AWD', 'mileage': 90000, 'fuel_type': 'Gasoline', 'condition': 'Used', 'body_type': 'SUV'},
            {'make': 'BYD', 'model': 'Dolphin', 'year': 2023, 'description': 'A brand new, affordable electric car.', 'owner_id': owner.id, 'is_approved': True, 'listing_type': 'sale', 'price': 2950000.00, 'transmission': 'Automatic', 'drivetrain': 'FWD', 'mileage': 5000, 'fuel_type': 'Electric', 'condition': 'New', 'body_type': 'Hatchback'},

            # For Rent
            {'make': 'Nissan', 'model': 'Qashqai', 'year': 2019, 'description': 'A popular and stylish crossover, available for daily rental.', 'owner_id': owner.id, 'is_approved': True, 'listing_type': 'rental', 'price': 3500.00, 'transmission': 'Automatic', 'drivetrain': 'FWD', 'mileage': 55000, 'fuel_type': 'Gasoline', 'condition': 'Used', 'body_type': 'SUV'},
            {'make': 'Kia', 'model': 'Sportage', 'year': 2020, 'description': 'Bold design with modern technology, available for daily rental.', 'owner_id': owner.id, 'is_approved': True, 'listing_type': 'rental', 'price': 4000.00, 'transmission': 'Automatic', 'drivetrain': 'AWD', 'mileage': 45000, 'fuel_type': 'Gasoline', 'condition': 'Used', 'body_type': 'SUV'},
        ]

        for car_data in cars_to_add:
            price = car_data.pop('price')
            listing_type = car_data.get('listing_type')
            
            # Create Car
            new_car = Car(**car_data)

            if listing_type == 'sale':
                new_car.fixed_price = price

            db.session.add(new_car)
            db.session.flush() # Use flush to get the car ID before creating related objects

            # Create Auction, Sale, or Rental Listing for the Car
            if listing_type == 'auction':
                new_auction = Auction(
                    start_time=datetime.utcnow(),
                    end_time=datetime.utcnow() + timedelta(days=7),
                    start_price=price,
                    current_price=price,
                    car_id=new_car.id
                )
                db.session.add(new_auction)
                print(f"Created car for AUCTION: {new_car.year} {new_car.make} {new_car.model}")
            elif listing_type == 'sale':
                print(f"Created car FOR SALE: {new_car.year} {new_car.make} {new_car.model}")
            elif listing_type == 'rental':
                new_rental = RentalListing(
                    price_per_day=price,
                    car_id=new_car.id
                )
                db.session.add(new_rental)
                print(f"Created car FOR RENT: {new_car.year} {new_car.make} {new_car.model}")

        db.session.commit()
        print("\nDatabase seeding complete!")
        print("Several cars were created as unapproved for testing the admin approval workflow.")