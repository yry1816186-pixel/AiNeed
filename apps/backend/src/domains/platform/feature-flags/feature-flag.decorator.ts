/* eslint-disable @typescript-eslint/no-explicit-any */
import { SetMetadata } from '@nestjs/common';

export const FEATURE_FLAG_KEY = 'featureFlag';
export const RequireFlag = (flagKey: string) => SetMetadata(FEATURE_FLAG_KEY, flagKey);
