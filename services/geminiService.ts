import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

export class GeminiService {
  private client: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private onTranscriptionUpdate: (text: string, isUser: boolean) => void;
  private onInterviewerMessage: (text: string) => void;
  private onError: (error: Error) => void;

  constructor(
    onTranscriptionUpdate: (text: string, isUser: boolean) => void,
    onInterviewerMessage: (text: string) => void,
    onError: (error: Error) => void
  ) {
    // Access API Key safely
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      const err = new Error("API Key not found in environment variables");
      console.error(err);
      throw err;
    }
    this.client = new GoogleGenAI({ apiKey });
    this.onTranscriptionUpdate = onTranscriptionUpdate;
    this.onInterviewerMessage = onInterviewerMessage;
    this.onError = onError;
  }

  async connect(lang: 'zh' | 'en') {
    const systemInstruction = lang === 'zh' 
      ? `你是一位专业的视频播客主持人。你的任务是聆听用户的发言，并充当即兴互动的搭档。
         1. 你的回复必须非常简短，通常是一两个鼓励性的词，或者每隔15-30秒提出一个简短的、有启发性的后续问题。
         2. 请不要长篇大论。
         3. 保持语气温柔、支持和好奇。
         4. 如果用户停止说话，请温和地提示一个新的相关话题。`
      : `You are a professional video podcast host. Your task is to listen to the user and act as an improv partner.
         1. Keep your responses very short, often just encouraging words, or a short, inspiring follow-up question every 15-30 seconds.
         2. Do not give long speeches.
         3. Maintain a gentle, supportive, and curious tone.
         4. If the user stops talking, gently prompt with a new related topic.`;

    try {
      this.sessionPromise = this.client.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Connection Opened');
          },
          onmessage: (message: LiveServerMessage) => {
            this.handleMessage(message);
          },
          onerror: (e: ErrorEvent) => {
            console.error('Gemini Live Error', e);
            const msg = (e.message || (e as any).error?.message || e.toString()).toLowerCase();
            
            if (msg.includes("not supported") || msg.includes("region") || msg.includes("location")) {
               this.onError(new Error("Region not supported"));
            } else if (msg.includes("403") || msg.includes("permission")) {
               this.onError(new Error("Access Denied"));
            } else {
               this.onError(new Error("Connection Error"));
            }
          },
          onclose: (e: CloseEvent) => {
            console.log('Gemini Live Connection Closed', e);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
          },
          systemInstruction: systemInstruction,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      });

      // Wait for connection to establish
      await this.sessionPromise;
    } catch (err: any) {
      console.error("Failed to connect to Gemini Live:", err);
      const msg = (err.message || err.toString()).toLowerCase();

      if (msg.includes("403") || msg.includes("permission") || msg.includes("key")) {
         throw new Error("Access Denied: Please check API Key.");
      } else if (msg.includes("not supported") || msg.includes("region") || msg.includes("location")) {
         throw new Error("Region Not Supported");
      }
      throw err;
    }
  }

  private handleMessage(message: LiveServerMessage) {
    // Handle Transcription
    if (message.serverContent?.inputTranscription) {
      const text = message.serverContent.inputTranscription.text;
      if (text) this.onTranscriptionUpdate(text, true);
    }
    
    if (message.serverContent?.outputTranscription) {
      const text = message.serverContent.outputTranscription.text;
      if (text) {
        this.onTranscriptionUpdate(text, false);
        // Also treat this as the "Prompt" for the floating window
        this.onInterviewerMessage(text);
      }
    }
  }

  async sendAudioChunk(base64PCM: string) {
    if (!this.sessionPromise) return;
    try {
      const session = await this.sessionPromise;
      session.sendRealtimeInput({
        media: {
          mimeType: 'audio/pcm;rate=16000',
          data: base64PCM
        }
      });
    } catch (error) {
      // If send fails (e.g. session closed), just log it, don't crash app
    }
  }

  disconnect() {
    this.sessionPromise = null;
  }
}