import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import VehicleCard from "../components/_components/VehicleCard";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("VehicleCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const vehicle = {
    id: "42",
    year: 2024,
    make: "Toyota",
    model: "Corolla",
    price: "2,500,000 ETB",
    image: "https://example.com/car.jpg",
    mileage: 12000,
    listingType: "Rental" as const,
  };

  it("navigates to the shared detail route when the card is pressed", () => {
    const { getByTestId } = render(<VehicleCard item={vehicle} />);

    fireEvent.press(getByTestId("vehicle-card-42"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/[id]",
      params: { id: "42" },
    });
  });

  it("stops propagation on compare and favorite actions", () => {
    const onToggleCompare = jest.fn();
    const onToggleFavorite = jest.fn();
    const stopPropagation = jest.fn();

    const { getByTestId } = render(
      <VehicleCard
        item={vehicle}
        onToggleCompare={onToggleCompare}
        onToggleFavorite={onToggleFavorite}
      />
    );

    fireEvent(getByTestId("vehicle-card-compare-42"), "press", { stopPropagation });
    fireEvent(getByTestId("vehicle-card-favorite-42"), "press", { stopPropagation });

    expect(stopPropagation).toHaveBeenCalledTimes(2);
    expect(onToggleCompare).toHaveBeenCalledWith("42");
    expect(onToggleFavorite).toHaveBeenCalledWith("42");
    expect(mockPush).not.toHaveBeenCalled();
  });
});
