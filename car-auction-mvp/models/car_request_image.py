from extensions import db


class CarRequestImage(db.Model):
    __tablename__ = "car_request_images"
    id = db.Column(db.Integer, primary_key=True)
    image_url = db.Column(db.String(255), nullable=False)
    request_id = db.Column(db.Integer, db.ForeignKey("car_requests.id"), nullable=False)

    def __repr__(self):
        return f"<CarRequestImage {self.id}>"
