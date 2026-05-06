import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import LoginScreen from "../app/(auth)/login";

const mockReplace = jest.fn();
const mockReset = jest.fn();
const mockSetAuth = jest.fn();
const mockSetRememberMe = jest.fn();
const mockLoginRequest = jest.fn();

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  useRouter: () => ({
    replace: mockReplace,
  }),
  useNavigation: () => ({
    reset: mockReset,
  }),
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    login: mockSetAuth,
    setRememberMe: mockSetRememberMe,
  }),
}));

jest.mock("@/lib/api/auth", () => ({
  login: (...args: unknown[]) => mockLoginRequest(...args),
}));

jest.mock("react-native-bouncy-checkbox", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");

  return ({ onPress, testID, text }: any) => (
    <Pressable testID={testID} onPress={() => onPress(true)}>
      <Text>{text}</Text>
    </Pressable>
  );
});

describe("LoginScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  it("persists remember-me preference and routes buyers to tabs", async () => {
    mockLoginRequest.mockResolvedValue({
      data: {
        token: "buyer-token",
        user: {
          id: 7,
          username: "buyer",
          email: "buyer@example.com",
          phone_number: null,
          is_admin: false,
          is_dealer: false,
          is_rental_company: false,
          is_verified: false,
          points: 0,
        },
      },
    });

    const { getByTestId } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId("login-input"), "buyer");
    fireEvent.changeText(getByTestId("password-input"), "secret123");
    fireEvent.press(getByTestId("remember-me-checkbox"));
    fireEvent.press(getByTestId("login-submit"));

    await waitFor(() => {
      expect(mockSetRememberMe).toHaveBeenCalledWith(true);
      expect(mockSetAuth).toHaveBeenCalledWith(
        expect.objectContaining({ username: "buyer" }),
        "buyer-token"
      );
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: "(tabs)" }],
      });
    });
  });

  it("routes dealers to the dealer dashboard after login", async () => {
    mockLoginRequest.mockResolvedValue({
      data: {
        token: "dealer-token",
        user: {
          id: 9,
          username: "dealer",
          email: "dealer@example.com",
          phone_number: null,
          is_admin: false,
          is_dealer: true,
          is_rental_company: false,
          is_verified: true,
          points: 5,
        },
      },
    });

    const { getByTestId } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId("login-input"), "dealer");
    fireEvent.changeText(getByTestId("password-input"), "secret123");
    fireEvent.press(getByTestId("login-submit"));

    await waitFor(() => {
      expect(mockSetRememberMe).toHaveBeenCalledWith(false);
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: "(dealer)" }],
      });
    });
  });

  it("routes rental companies to the rental dashboard after login", async () => {
    mockLoginRequest.mockResolvedValue({
      data: {
        token: "rental-token",
        user: {
          id: 11,
          username: "rentalco",
          email: "rental@example.com",
          phone_number: null,
          is_admin: false,
          is_dealer: false,
          is_rental_company: true,
          is_verified: true,
          points: 0,
        },
      },
    });

    const { getByTestId } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId("login-input"), "rentalco");
    fireEvent.changeText(getByTestId("password-input"), "secret123");
    fireEvent.press(getByTestId("login-submit"));

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: "(rental)" }],
      });
    });
  });

  it("shows an inline error message when login fails", async () => {
    mockLoginRequest.mockRejectedValue({
      response: {
        data: {
          message: "Invalid credentials",
        },
      },
    });

    const { getByTestId, findByText } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId("login-input"), "buyer");
    fireEvent.changeText(getByTestId("password-input"), "wrongpass");
    fireEvent.press(getByTestId("login-submit"));

    expect(await findByText("Invalid credentials")).toBeTruthy();
  });

});
