# Device AI Text

This folder is designed for fully offline use.

- Choose a local .gguf model.
- No model is downloaded by this page.
- No CDN is imported.
- No Hugging Face request is made.
- Chats are stored locally.
- The app does not upload prompts.

Important: GGUF inference requires a browser-compatible WebAssembly/WebGPU inference runtime. The GitHub text-file connector cannot add binary WASM runtime files, so this generated folder deliberately does not pretend that GGUF inference is already bundled.

Files:
- index.html
- offline-runtime.js

To make the folder actually execute GGUF models with no network, add a compatible local WASM/WebGPU runtime and wire its load/generate API to OfflineAI.load().