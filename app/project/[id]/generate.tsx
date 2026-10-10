import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native";

import { Screen } from "@ui/components/Screen";

export default function GenerateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen testID="generate-screen">
      <Text className="mt-8 text-xl font-semibold text-content dark:text-content-dark">
        Generate
      </Text>
      <Text className="mt-2 text-subtle dark:text-subtle-dark">Project: {id}</Text>
    </Screen>
  );
}
