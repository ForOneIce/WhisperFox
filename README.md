# Fox Classroom Studio (WhisperFox)

WhisperFox is a privacy-first, browser-based virtual recording studio. It features a reactive 2D Fox avatar that replaces your real face on camera.

![Fox Classroom Studio Screenshot](/screenshot.png)

## 🌟 Current Features (Implemented)

### 🦊 Interactive Virtual Avatar
*   **Custom Canvas Rendering:** A fully programmatic 2D Fox avatar drawn on HTML5 Canvas (no external Live2D models required).
*   **Smart Tracking:**
    *   **Eye Tracking:** The avatar's eyes follow your mouse cursor, simulating engagement with the digital workspace.
    *   **Lip Sync:** Real-time audio analysis converts your microphone volume into mouth movements.
    *   **Input Mimicry:** The avatar simulates typing on a keyboard when you type and clicking a mouse when you click.

### 🎬 Recording Studio
*   **Local Recording:** Records audio directly in the browser (MP4).
*   **Multi-Format Support:** Switch aspect ratios on the fly:
    *   **9:16** (TikTok/Shorts)
    *   **16:9** (YouTube/Desktop)
    *   **1:1** & **3:4** (Social Media)
*   **Basic Voice Effects:** Simple pitch-shifting (Cute/Deep/Robot) using Web Audio API.

### 🌍 Internationalization
*   Full UI support for **English** and **Chinese (Simplified)**.

---

## 🚀 Roadmap / Planned Features

The following features are currently in development and **not yet fully implemented**:

*   **🤖 AI Co-host (Gemini Live):** Real-time floating window displaying context-aware questions and prompts to help the creator during recording.
*   **📝 Auto-Subtitles:** Generating synchronized subtitles automatically upon video export.
*   **🗣️ AI Voice Privacy (TTS):** Replacing the user's voice entirely with a Text-to-Speech engine for complete audio anonymity (Speech-to-Speech).

---

## 🛠️ Tech Stack

*   **Frontend:** React 19, TypeScript, Tailwind CSS
*   **Graphics:** HTML5 Canvas API (Custom procedural drawing)
*   **Audio:** Web Audio API
*   **Icons:** Lucide React

## 🚀 Getting Started

### Prerequisites
*   Node.js installed.

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm start
    ```

## 🎮 Usage Controls

*   **Zoom:** Use the scroll wheel or on-screen buttons to zoom the avatar in/out.
*   **Position:** Click and drag to move the avatar around the desk.
*   **Eye Contact:** Move your mouse cursor to control where the avatar looks.
*   **Recording:**
    1.  Select your desired **Aspect Ratio**.
    2.  Click **Start Lesson** to begin recording.
    3.  Speak and interact; the avatar will mimic you.
    4.  Click **End Lesson** to save your video locally.