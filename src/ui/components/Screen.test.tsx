import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";

import { Screen } from "./Screen";

describe("Screen", () => {
  it("renders its children inside a themed wrapper", async () => {
    await render(
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <Screen testID="screen">
          <Text>Hello</Text>
        </Screen>
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId("screen")).toBeTruthy();
    expect(screen.getByText("Hello")).toBeTruthy();
  });
});
