
export interface LessonContent {
  title: string;
  introduction: string;
  anatomy: string;
  technique: string;
  risks: string;
  aftercare: string;
  imagePrompts: string[];
  // Optional Key Points for fallback/summary
  anatomyPoints?: string[];
  techniquePoints?: string[];
  risksPoints?: string[];
  aftercarePoints?: string[];
}

export interface GeneratedImage {
  prompt: string;
  url: string;
}

export interface Lesson {
  id: string;
  createdAt: number;
  content: LessonContent;
  images: GeneratedImage[];
  audioDurationSec?: number;
  audioBase64?: string;
  audioMimeType?: string;
}

export enum AppState {
  DASHBOARD = 'DASHBOARD',
  RECORDING = 'RECORDING',
  GENERATING = 'GENERATING',
  VIEWING = 'VIEWING',
  CAMERA = 'CAMERA',
}

// AI Terminal Types
export type AiActionType = 'UPDATE_SECTION' | 'NAVIGATE' | 'GENERATE_IMAGE' | 'NONE';

export interface AiAction {
  type: AiActionType;
  payload?: any; // e.g. { section: 'anatomy', content: '...' } or { target: 'RECORDING' }
  label?: string; // Text to show on the button
}

export interface AiMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  action?: AiAction;
  suggestions?: string[]; // Quick replies for the user
}
