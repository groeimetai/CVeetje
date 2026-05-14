export type InputModality = 'text' | 'image' | 'pdf';

export interface LinkedInInputSource {
  type: 'text' | 'file';
  text?: string;
  file?: {
    name: string;
    mediaType: string; // 'application/pdf' | 'image/png' | 'image/jpeg'
    base64: string;    // Base64 encoded data (without data URL prefix)
  };
}

// Multi-source input for profile information
export interface ProfileInputSource {
  id: string; // Unique ID for UI management
  type: 'text' | 'file';
  text?: string;
  file?: {
    name: string;
    mediaType: string; // 'application/pdf' | 'image/png' | 'image/jpeg' | 'image/webp'
    base64: string;    // Base64 encoded data (without data URL prefix)
  };
}

export interface ProfileInputData {
  sources: ProfileInputSource[];
}

export interface ModelCapabilities {
  structuredOutput: boolean;
  toolCalling: boolean;
  reasoning: boolean;
  inputModalities: InputModality[];
}
