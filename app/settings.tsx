import { Text } from "react-native";

import { Screen } from "@ui/components/Screen";

export default function SettingsScreen() {
  return (
    <Screen testID="settings-screen">
      <Text className="mt-8 text-xl font-semibold text-content dark:text-content-dark">
        Settings
      </Text>
      <Text className="mt-2 text-subtle dark:text-subtle-dark">
        Theme, language, output defaults and font management will appear here.
      </Text>
    </Screen>
  );
}
