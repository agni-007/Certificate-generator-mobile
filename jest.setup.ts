import { View } from "react-native";
import mockSafeArea from "react-native-safe-area-context/jest/mock";

// RNTL v14 auto-extends Jest matchers on import, so no explicit matcher setup
// is required here. The safe-area-context mock renders a plain View so
// SafeAreaView children are visible in tests. (The `mock` prefix is required
// so the factory may reference these bindings.)
const mockView: typeof View = View;

jest.mock("react-native-safe-area-context", () => ({
  ...(mockSafeArea as Record<string, unknown>),
  SafeAreaView: mockView,
}));
