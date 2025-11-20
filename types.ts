export enum AspectRatio {
  NineSixteen = '9:16',
  SixteenNine = '16:9',
  ThreeFour = '3:4',
  OneOne = '1:1',
}

export enum VoiceEffect {
  None = 'None',
  Cute = 'Cute', // Pitch Up
  Deep = 'Deep', // Pitch Down
  Robot = 'Robot', // Modulation
}

export enum AppState {
  Idle = 'Idle',
  Recording = 'Recording',
  Processing = 'Processing',
  Finished = 'Finished',
}

export interface TranscriptionItem {
  text: string;
  isUser: boolean;
  timestamp: number; // Date.now()
  relativeTimestamp: number; // ms since recording start
}

export interface AvatarState {
  mouthOpen: number; // 0 to 1
  eyeX: number; // -1 to 1
  eyeY: number; // -1 to 1
  blink: boolean;
  // Interaction States
  keyPressLeft: boolean;
  keyPressRight: boolean;
  mouseDown: boolean;
}