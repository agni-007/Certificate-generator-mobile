import type { ExpoConfig, ConfigContext } from "expo/config";

// Offline guarantee (implementation.md Section 9): block network permissions in
// production Android builds only. Development builds need network for Metro.
const isProd = process.env.EAS_BUILD_PROFILE === "production";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Certificate Generator",
  slug: "certificate-generator-mobile",
  scheme: "certgen",
  version: "1.0.0",
  orientation: "default",
  userInterfaceStyle: "automatic",
  icon: "./src/assets/icon.png",
  assetBundlePatterns: ["**/*"],
  ios: {
    bundleIdentifier: "com.agni.certificategenerator",
    supportsTablet: true,
    infoPlist: {
      UIFileSharingEnabled: true,
      LSSupportsOpeningDocumentsInPlace: true,
    },
  },
  android: {
    package: "com.agni.certificategenerator",
    adaptiveIcon: {
      foregroundImage: "./src/assets/adaptive-icon.png",
      backgroundColor: "#4f46e5",
    },
    blockedPermissions: isProd
      ? ["android.permission.INTERNET", "android.permission.ACCESS_NETWORK_STATE"]
      : [],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./src/assets/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-sqlite",
    "expo-document-picker",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#4f46e5",
        image: "./src/assets/splash-icon.png",
        imageWidth: 200,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  // OTA updates intentionally disabled: this app must never phone home.
  updates: {
    enabled: false,
  },
});
