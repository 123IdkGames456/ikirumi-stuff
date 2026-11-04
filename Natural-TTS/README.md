# Natural TTS

A standalone site folder for Ikirumi Stuff.

- Uses Kokoro TTS through Transformers.js.
- Generates speech in the browser, not through a speech-generation server.
- Uses WebGPU when available and WebAssembly as a fallback.
- The model is downloaded on first use and may be cached by the browser.
- The included Kokoro 82M model is for English speech; it does not support Norwegian.

Open `index.html` through the Ikirumi Stuff GitHub Pages site. The browser must be online for the first model download.

Model project: https://github.com/hexgrad/kokoro
