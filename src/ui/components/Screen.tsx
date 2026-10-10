import type { PropsWithChildren } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export interface ScreenProps {
  testID?: string;
}

/**
 * App screen wrapper: safe-area aware, themed background that follows light/dark.
 */
export function Screen({ children, testID }: PropsWithChildren<ScreenProps>) {
  return (
    <SafeAreaView testID={testID} className="flex-1 bg-canvas dark:bg-canvas-dark">
      <View className="flex-1 px-5">{children}</View>
    </SafeAreaView>
  );
}
