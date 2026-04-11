import { Platform } from 'react-native';

export async function requestPermissionsAsync(): Promise<{ status: string }> {
  return { status: 'granted' };
}

export async function getPermissionsAsync(): Promise<{ status: string }> {
  return { status: 'granted' };
}

export async function saveToLibraryAsync(uri: string): Promise<void> {
  console.warn('expo-media-library.saveToLibraryAsync is a stub');
}

export async function getAssetsAsync(options?: {
  first?: number;
  after?: string;
  mediaType?: string;
  sortBy?: string[];
}): Promise<{ 
  assets: Array<{
    id: string;
    uri: string;
    width: number;
    height: number;
    creationTime: number;
  }>;
  hasNextPage: boolean;
  endCursor: string | null;
}> {
  return { assets: [], hasNextPage: false, endCursor: null };
}

export const MediaType = {
  All: 'All',
  photo: 'photo',
  video: 'video',
  audio: 'audio',
} as const;

export default {
  requestPermissionsAsync,
  getPermissionsAsync,
  saveToLibraryAsync,
  getAssetsAsync,
  MediaType,
};
