import { Platform, PermissionsAndroid } from 'react-native';

export const RECORDING_OPTIONS_PRESET = {
  HIGH_QUALITY: {
    android: {
      extension: '.m4a',
      outputFormat: 'mpeg4' as const,
      audioEncoding: 'aac' as const,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
    },
    ios: {
      extension: '.m4a',
      audioQuality: 'max' as const,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {
      mimeType: 'audio/webm',
      bitsPerSecond: 128000,
    },
  },
  LOW_QUALITY: {
    android: {
      extension: '.m4a',
      outputFormat: 'mpeg4' as const,
      audioEncoding: 'aac' as const,
      sampleRate: 22050,
      numberOfChannels: 1,
      bitRate: 64000,
    },
    ios: {
      extension: '.m4a',
      audioQuality: 'min' as const,
      sampleRate: 22050,
      numberOfChannels: 1,
      bitRate: 64000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {
      mimeType: 'audio/webm',
      bitsPerSecond: 64000,
    },
  },
};

export interface RecordingOptions {
  android?: {
    extension?: string;
    outputFormat?: 'mpeg4' | 'amr_nb' | 'amr_wb' | 'ogg';
    audioEncoding?: 'aac' | 'amr_nb' | 'amr_wb' | 'opus';
    sampleRate?: number;
    numberOfChannels?: number;
    bitRate?: number;
  };
  ios?: {
    extension?: string;
    audioQuality?: 'min' | 'low' | 'medium' | 'high' | 'max';
    sampleRate?: number;
    numberOfChannels?: number;
    bitRate?: number;
    linearPCMBitDepth?: number;
    linearPCMIsBigEndian?: boolean;
    linearPCMIsFloat?: boolean;
  };
  web?: {
    mimeType?: string;
    bitsPerSecond?: number;
  };
}

export interface RecordingStatus {
  isRecording: boolean;
  durationMillis: number;
  canRecord?: boolean;
  isDoneRecording?: boolean;
}

export interface SoundStatus {
  isLoaded: boolean;
  isPlaying: boolean;
  durationMillis: number;
  positionMillis: number;
  shouldPlay?: boolean;
  rate?: number;
  shouldCorrectPitch?: boolean;
  volume?: number;
  isMuted?: boolean;
  isBuffering?: boolean;
  didJustFinish?: boolean;
}

export type SoundStatusCallback = (status: SoundStatus) => void;

export class Recording {
  private _uri: string | null = null;
  private _isRecording = false;

  static async createAsync(options: RecordingOptions): Promise<{ recording: Recording }> {
    const recording = new Recording();
    await recording.prepareToRecordAsync(options);
    await recording.startAsync();
    return { recording };
  }

  async prepareToRecordAsync(options: RecordingOptions): Promise<void> {
    this._uri = null;
    this._isRecording = false;
  }

  async startAsync(): Promise<void> {
    this._isRecording = true;
  }

  async stopAndUnloadAsync(): Promise<void> {
    this._isRecording = false;
    this._uri = `file://recording_${Date.now()}.m4a`;
  }

  getURI(): string | null {
    return this._uri;
  }

  getStatusAsync(): Promise<RecordingStatus> {
    return Promise.resolve({
      isRecording: this._isRecording,
      durationMillis: 0,
    });
  }
}

export type SoundSource = number | { uri: string } | { localUri: string } | Asset;

interface Asset {
  uri: string;
  width?: number;
  height?: number;
}

export class Sound {
  static async createAsync(
    source: SoundSource,
    initialStatus?: Partial<SoundStatus>,
    onPlaybackStatusUpdate?: SoundStatusCallback
  ): Promise<{ sound: Sound; status: SoundStatus }> {
    const sound = new Sound();
    return { sound, status: { isLoaded: true, isPlaying: false, durationMillis: 0, positionMillis: 0 } };
  }

  async playAsync(): Promise<void> {}

  async pauseAsync(): Promise<void> {}

  async stopAsync(): Promise<void> {}

  async unloadAsync(): Promise<void> {}

  async setStatusAsync(status: Partial<SoundStatus>): Promise<void> {}

  async getStatusAsync(): Promise<SoundStatus> {
    return { isLoaded: true, isPlaying: false, durationMillis: 0, positionMillis: 0 };
  }

  setOnPlaybackStatusUpdate(callback: SoundStatusCallback | null): void {}
}

export const Audio = {
  Recording,
  Sound,
  RecordingOptionsPresets: RECORDING_OPTIONS_PRESET,
  
  async requestPermissionsAsync(): Promise<{ status: string }> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        return { status: granted === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied' };
      } catch {
        return { status: 'denied' };
      }
    }
    return { status: 'granted' };
  },

  async setAudioModeAsync(mode: {
    allowsRecordingIOS?: boolean;
    playsInSilentModeIOS?: boolean;
  }): Promise<void> {},
};

export default { Audio, Recording, Sound };
