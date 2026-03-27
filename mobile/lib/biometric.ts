import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const BIOMETRIC_ENABLED_KEY = "igolo_biometric_enabled";
const BIOMETRIC_EMAIL_KEY = "igolo_biometric_email";

/**
 * Check whether the device supports biometric authentication.
 */
export async function isBiometricAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;

  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

/**
 * Return the primary biometric type the device supports.
 */
export async function getBiometricType(): Promise<
  "fingerprint" | "face" | "iris" | null
> {
  const types =
    await LocalAuthentication.supportedAuthenticationTypesAsync();

  if (
    types.includes(
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
    )
  ) {
    return "face";
  }
  if (
    types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
  ) {
    return "fingerprint";
  }
  if (
    types.includes(LocalAuthentication.AuthenticationType.IRIS)
  ) {
    return "iris";
  }
  return null;
}

/**
 * Return a human-readable label such as "Face ID" or "Touch ID".
 */
export async function getBiometricLabel(): Promise<string> {
  const type = await getBiometricType();
  switch (type) {
    case "face":
      return "Face ID";
    case "fingerprint":
      return "Touch ID";
    case "iris":
      return "Iris";
    default:
      return "Biometrics";
  }
}

/**
 * Prompt the user to authenticate with biometrics.
 * Returns true if authentication succeeded.
 */
export async function authenticateWithBiometric(): Promise<boolean> {
  const label = await getBiometricLabel();

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: `Sign in with ${label}`,
    cancelLabel: "Use Password",
    disableDeviceFallback: true,
    fallbackLabel: "",
  });

  return result.success;
}

/**
 * Store the fact that biometrics are enabled for a given email.
 */
export async function enableBiometric(email: string): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, "true");
  await SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, email);
}

/**
 * Disable biometric login.
 */
export async function disableBiometric(): Promise<void> {
  await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
  await SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY);
}

/**
 * Check whether the user previously enabled biometric login.
 */
export async function isBiometricEnabled(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
  return val === "true";
}

/**
 * Get the email address that biometric login is associated with.
 */
export async function getBiometricEmail(): Promise<string | null> {
  return SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
}
