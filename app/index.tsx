import { Link } from "expo-router";
import { Text, View } from "react-native";

import { Screen } from "@ui/components/Screen";

export default function HomeScreen() {
  return (
    <Screen testID="home-screen">
      <View className="flex-1 items-center justify-center gap-3">
        <Text className="text-2xl font-semibold text-content dark:text-content-dark">
          Certificate Generator
        </Text>
        <Text className="text-center text-subtle dark:text-subtle-dark">
          Fully offline. Your data never leaves this device.
        </Text>
        <Link href="/settings" className="mt-6 text-accent-600 dark:text-accent-400">
          Settings
        </Link>
      </View>
    </Screen>
  );
}
