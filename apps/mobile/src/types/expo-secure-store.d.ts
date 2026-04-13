declare module 'expo-secure-store' {
  export interface SecureStoreOptions {
    keychainAccessible?: string;
    keychainAccessGroup?: string;
    authenticationPrompt?: string;
    requireAuthentication?: boolean;
  }

  export function setItemAsync(
    key: string,
    value: string,
    options?: SecureStoreOptions,
  ): Promise<void>;

  export function getItemAsync(
    key: string,
    options?: SecureStoreOptions,
  ): Promise<string | null>;

  export function deleteItemAsync(
    key: string,
    options?: SecureStoreOptions,
  ): Promise<void>;

  export function canUseSecureStoreOnDevice(): boolean;
}
