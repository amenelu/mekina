import React from "react";
import { Alert } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import RequestUploadScreen from "../app/(tabs)/request/upload";
import TradeInScreen from "../app/trade-in/index";

const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockToken: string | null = null;

jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
    back: mockBack,
  }),
  useLocalSearchParams: () => ({}),
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    token: mockToken,
  }),
}));

jest.mock("@/hooks/useRequestDraftPersistence", () => ({
  useRequestDraftPersistence: jest.fn(),
}));

jest.mock("@/lib/requestDraft", () => ({
  clearRequestDraft: jest.fn(),
}));

jest.mock("@/constants/Api", () => "http://example.test");
jest.mock("axios", () => ({
  create: () => ({
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    post: jest.fn(),
  }),
}));

describe("protected submit screens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToken = null;
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("redirects unauthenticated users before request upload submission", () => {
    const { getByTestId } = render(<RequestUploadScreen />);

    fireEvent.press(getByTestId("request-upload-submit"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Login Required",
      "Please log in before submitting a request.",
      expect.any(Array)
    );
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    buttons[0].onPress();
    expect(mockReplace).toHaveBeenCalledWith("/(auth)/login");
  });

  it("redirects unauthenticated users before trade-in submission", () => {
    const { getByTestId } = render(<TradeInScreen />);

    fireEvent.press(getByTestId("trade-in-submit"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Login Required",
      "Please log in before submitting a trade-in request.",
      expect.any(Array)
    );
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    buttons[0].onPress();
    expect(mockReplace).toHaveBeenCalledWith("/(auth)/login");
  });
});
