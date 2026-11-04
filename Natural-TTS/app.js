import { KokoroTTS } from "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm";

const $ = id => document.getElementById(id);
const textInput = $("text");
const loadButton = $("load");
const playButton = $("play");
const pauseButton = $("pause");
const stopButton = $("stop");
let tts = null;
let audioContext = null;
let currentSource = null;
let runToken = 0;
let paused = false;
let active = false;

function setStatus(message, busy = false) {
  $("status").textContent = message;
  $("statusDot").classList.toggle("active", busy);
}
function setProgress(value) {
  $("progressBar").style.width = Math.max(0, Math.min(100, value)) + "%";
}
function updateCount() {
  const words = textInput.value.trim() ? textInput.value.trim().split(/\s+/).length : 0;
  $("wordCount").textContent = words + (words === 1 ? " word" : " words");
}
textInput.addEventListener("input", updateCount);
$("speed").addEventListener("input", () => $("speedValue").textContent = Number($("speed").value).toFixed(2).replace(/0+$/,"").replace(/\.$/,"") + "×");

async function loadModel() {
  if (tts) return tts;
  loadButton.disabled = true;
  playButton.disabled = true;
  setStatus("Downloading the AI voice model. The first download is large…", true);
  setProgress(4);
  try {
    const useWebGPU = !!navigator.gpu;
    tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
      dtype: useWebGPU ? "fp32" : "q8",
      device: useWebGPU ? "webgpu" : "wasm",
      progress_callback: event => {
        if (event && typeof event.progress === "number") setProgress(event.progress);
        if (event && event.file) setStatus("Loading " + event.file + "…", true);
      }
    });
    setProgress(100);
    playButton.disabled = false;
    setStatus("AI voice ready. Paste some text and press Generate & play.");
    return tts;
  } catch (error) {
    console.error(error);
    tts = null;
    setStatus("Could not load the model. Refresh and try again, or use a newer browser.");
    loadButton.disabled = false;
    setProgress(0);
    throw error;
  } finally {
    if (tts) loadButton.textContent = "✓ Voice loaded";
  }
}

function stopAudio() {
  runToken++;
  if (currentSource) {
    try { currentSource.stop(); } catch {}
    currentSource.disconnect();
    currentSource = null;
  }
  active = false;
  paused = false;
  pauseButton.disabled = true;
  pauseButton.textContent = "Ⅱ Pause";
  stopButton.disabled = true;
}
function playBuffer(rawAudio, token) {
  return new Promise((resolve, reject) => {
    if (token !== runToken) return resolve();
    const samples = rawAudio.audio;
    const rate = rawAudio.sampling_rate || 24000;
    if (!samples || !samples.length) return resolve();
    if (!audioContext) audioContext = new AudioContext();
    const buffer = audioContext.createBuffer(1, samples.length, rate);
    buffer.copyToChannel(Float32Array.from(samples), 0);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = Number($("speed").value);
    source.connect(audioContext.destination);
    currentSource = source;
    source.onended = () => {
      if (currentSource === source) currentSource = null;
      resolve();
    };
    source.start();
    if (audioContext.state === "suspended") audioContext.resume();
  });
}

async function generateAndPlay() {
  const text = textInput.value.trim();
  if (!text) {
    setStatus("Add some text first.");
    textInput.focus();
    return;
  }
  try {
    await loadModel();
  } catch {
    return;
  }
  stopAudio();
  const token = runToken;
  active = true;
  pauseButton.disabled = false;
  stopButton.disabled = false;
  playButton.disabled = true;
  setStatus("Preparing speech…", true);
  try {
    const stream = tts.stream(text, { voice: $("voice").value, speed: 1 });
    let spoken = 0;
    for await (const part of stream) {
      if (token !== runToken) break;
      setStatus("Generating and playing speech…", true);
      await playBuffer(part.audio, token);
      if (token !== runToken) break;
      spoken++;
    }
    if (token === runToken) setStatus(spoken ? "Finished. Press play to listen again." : "No audio was generated.");
  } catch (error) {
    console.error(error);
    if (token === runToken) setStatus("Speech generation failed. Try a shorter text or reload the page.");
  } finally {
    if (token === runToken) {
      active = false;
      playButton.disabled = false;
      pauseButton.disabled = true;
      stopButton.disabled = true;
      pauseButton.textContent = "Ⅱ Pause";
    }
  }
}

loadButton.addEventListener("click", () => loadModel().catch(() => {}));
playButton.addEventListener("click", generateAndPlay);
pauseButton.addEventListener("click", async () => {
  if (!audioContext) return;
  if (!paused) {
    await audioContext.suspend();
    paused = true;
    pauseButton.textContent = "▶ Resume";
    setStatus("Paused.");
  } else {
    await audioContext.resume();
    paused = false;
    pauseButton.textContent = "Ⅱ Pause";
    setStatus("Playing…", true);
  }
});
stopButton.addEventListener("click", () => {
  stopAudio();
  playButton.disabled = !tts;
  setStatus("Stopped.");
});
updateCount();