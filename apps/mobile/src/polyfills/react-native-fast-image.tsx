import React from 'react';
import { Image, ImageProps, StyleSheet } from 'react-native';

export interface FastImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string; priority?: string } | number;
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'center';
  onLoad?: () => void;
  onError?: () => void;
}

export const priority = {
  low: 'low',
  normal: 'normal',
  high: 'high',
} as const;

export const resizeMode = {
  contain: 'contain' as const,
  cover: 'cover' as const,
  stretch: 'stretch' as const,
  center: 'center' as const,
} as const;

export const cacheControl = {
  immutable: 'immutable',
  web: 'web',
  cacheOnly: 'cacheOnly',
} as const;

export const FastImage: React.FC<FastImageProps> & {
  priority: typeof priority;
  resizeMode: typeof resizeMode;
  cacheControl: typeof cacheControl;
} = ({
  source,
  resizeMode = 'cover',
  onLoad,
  onError,
  style,
  ...props
}) => {
  const imageSource = typeof source === 'object' && 'uri' in source 
    ? { uri: source.uri } 
    : source;
    
  return (
    <Image
      source={imageSource}
      resizeMode={resizeMode}
      onLoad={onLoad}
      onError={onError}
      style={style}
      {...props}
    />
  );
};

FastImage.priority = priority;
FastImage.resizeMode = resizeMode;
FastImage.cacheControl = cacheControl;

export default FastImage;
