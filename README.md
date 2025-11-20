# Fox Classroom Studio (WhisperFox)

WhisperFox is a privacy-first, browser-based virtual recording studio. It features a reactive 2D Fox avatar that replaces your face on camera, complete with a "Silent AI Co-host" powered by Google Gemini to help keep your commentary flowing.

## 🌟 Features

### 🦊 Interactive Virtual Avatar
*   **Custom Canvas Rendering:** A fully programmatic 2D Fox avatar drawn on HTML5 Canvas (no external Live2D models required).
*   **Eye Tracking:** The avatar's eyes follow your mouse cursor, simulating engagement with the digital workspace.
*   **Lip Sync:** Real-time audio analysis converts your microphone volume into mouth movements.
*   **Input Mimicry:** The avatar simulates typing on a keyboard when you type and clicking a mouse when you click.

### 🤖 AI Teaching Assistant (Gemini Live)
*   **Silent Interviewer Mode:** Powered by **Google Gemini 2.5 Flash (Multimodal Live)**.
*   **Contextual Prompts:** The AI listens to your speech and generates short, relevant text questions or topic suggestions displayed on-screen to inspire your creativity.
*   **Non-Intrusive:** The AI acts as a text-only teleprompter/director, ensuring your audio recording remains clean.

### 🎙️ Audio Studio
*   **Voice Modulation:** Built-in Web Audio API effects:
    *   **Cute:** Pitch shifting (Up)
    *   **Deep:** Pitch shifting (Down)
    *   **Robot:** Ring modulation
*   **Real-time Processing:** Zero-latency audio feedback loop.

### 🎬 Production Tools
*   **Multi-Format Support:** Switch aspect ratios on the fly:
    *   **9:16** (TikTok/Shorts)
    *   **16:9** (YouTube/Desktop)
    *   **1:1** & **3:4** (Social Media)
*   **Customizable Environment:** Edit the text/formulas written on the virtual chalkboard.
*   **Local Recording:** Records video and audio directly in the browser (WebM/MP4) with no server-side processing for video.

### 🌍 Internationalization
*   Full UI support for **English** and **Chinese (Simplified)**.

## 🛠️ Tech Stack

*   **Frontend:** React 19, TypeScript, Tailwind CSS
*   **AI:** `@google/genai` SDK (Gemini 2.5 Flash Native Audio)
*   **Graphics:** HTML5 Canvas API (Custom procedural drawing)
*   **Audio:** Web Audio API (`ScriptProcessorNode` for pitch shifting)
*   **Icons:** Lucide React

## 🚀 Getting Started

### Prerequisites
*   Node.js installed.
*   A Google Gemini API Key.

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up your environment variables:
    *   Ensure `process.env.API_KEY` is available with your Google Gemini API key.
4.  Start the development server:
    ```bash
    npm start
    ```

## 🎮 Usage Controls

*   **Zoom:** Use the scroll wheel or on-screen buttons to zoom the avatar in/out.
*   **Position:** Click and drag to move the avatar around the desk.
*   **Eye Contact:** Move your mouse cursor to control where the avatar looks.
*   **Recording:**
    1.  Select your desired **Aspect Ratio**.
    2.  Choose a **Voice Effect** (optional).
    3.  Click **Start Lesson** to begin recording and connect to the AI.
    4.  Speak freely; watch the floating window for AI prompts.
    5.  Click **End Lesson** to stop and save your video.

## 🔒 Privacy

*   **Video:** All video rendering and recording happens locally in your browser. Your camera feed is processed locally to drive audio levels but is never sent to a server.
*   **Audio:** Audio data is streamed to Google Gemini *only* when recording is active to generate text prompts.
