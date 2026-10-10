import { Text } from "react-native";

import { Screen } from "@ui/components/Screen";

export default function OnboardingScreen() {
  return (
    <Screen testID="onboarding-screen">
      <Text className="mt-8 text-xl font-semibold text-content dark:text-content-dark">
        Welcome
      </Text>
      <Text className="mt-2 text-subtle dark:text-subtle-dark">
        Pick a template, add names, generate certificates — all on your device.
      </Text>
    </Screen>
  );
}
