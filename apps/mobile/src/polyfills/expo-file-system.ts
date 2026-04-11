import { Platform } from 'react-native';

export const EncodingType = {
  UTF8: 'utf8',
  Base64: 'base64',
} as const;

export const documentDirectory = Platform.OS === 'android' 
  ? 'file:///data/user/0/com.aineed/files/' 
  : `${Platform.OS === 'ios' ? 'file://' : ''}${Platform.OS === 'ios' ? '' : ''}`;

export const cacheDirectory = Platform.OS === 'android'
  ? 'file:///data/user/0/com.aineed/cache/'
  : documentDirectory;

export async function readAsStringAsync(uri: string, options?: { encoding?: string }): Promise<string> {
  const response = await fetch(uri);
  const encoding = options?.encoding || 'utf8';
  if (encoding === 'base64') {
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  return response.text();
}

export async function writeAsStringAsync(
  uri: string, 
  content: string, 
  options?: { encoding?: string }
): Promise<void> {
  console.warn('FileSystem.writeAsStringAsync is a stub - not fully implemented');
}

export async function deleteAsync(uri: string, options?: { idempotent?: boolean }): Promise<void> {
  console.warn('FileSystem.deleteAsync is a stub - not fully implemented');
}

export async function makeDirectoryAsync(uri: string, options?: { intermediates?: boolean }): Promise<void> {
  console.warn('FileSystem.makeDirectoryAsync is a stub - not fully implemented');
}

export async function getInfoAsync(uri: string): Promise<{ exists: boolean; isDirectory: boolean; uri: string }> {
  return { exists: false, isDirectory: false, uri };
}

export async function downloadAsync(
  uri: string, 
  fileUri: string
): Promise<{ uri: string; status: number }> {
  console.warn('FileSystem.downloadAsync is a stub - not fully implemented');
  return { uri: fileUri, status: 200 };
}

export async function copyAsync(options: { from: string; to: string }): Promise<string> {
  console.warn('FileSystem.copyAsync is a stub - not fully implemented');
  return options.to;
}

export default {
  EncodingType,
  documentDirectory,
  cacheDirectory,
  readAsStringAsync,
  writeAsStringAsync,
  deleteAsync,
  makeDirectoryAsync,
  getInfoAsync,
  downloadAsync,
  copyAsync,
};
