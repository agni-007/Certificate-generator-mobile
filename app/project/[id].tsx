import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native";

import { Screen } from "@ui/components/Screen";

export default function EditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen testID="editor-screen">
      <Text className="mt-8 text-xl font-semibold text-content dark:text-content-dark">Editor</Text>
      <Text className="mt-2 text-subtle dark:text-subtle-dark">Project: {id}</Text>
    </Screen>
  );
}
