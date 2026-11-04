const $ = id => document.getElementById(id);
const textInput = $("text");
const loadButton = $("load");
const playButton = $("play");
const pauseButton = $("pause");
const stopButton = $("stop");

let KokoroTTSClass = null;
let tts = null;
let audio = null;
let audioUrl = null;
let loadingPromise = null;

function setStatus(message, busy = false) {
  $("status").textContent = message;
  $("statusDot").classList.toggle("active", busy);
}
function setProgress(value) {
  $("progressBar").style.width = Math.max(0, Math.min(100, value)) + "%";
  $("downloadPercent").textContent = Math.round(Math.max(0, Math.min(100, value))) + "%";
}
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return value.toFixed(unit === 0 ? 0 : 1) + " " + units[unit];
}
function updateDownloadInfo(info) {
  if (!info) return;
  if (info.status === "progress_total" && Number.isFinite(info.loaded) && Number.isFinite(info.total) && info.total > 0) {
    setProgress(info.progress ?? (info.loaded / info.total) * 100);
    $("downloadSize").textContent = formatBytes(info.loaded) + " / " + formatBytes(info.total);
    $("downloadFile").textContent = "Total model download";
  } else if (info.status === "progress" && Number.isFinite(info.loaded)) {
    if (Number.isFinite(info.total) && info.total > 0) {
      setProgress((info.loaded / info.total) * 100);
      $("downloadSize").textContent = formatBytes(info.loaded) + " / " + formatBytes(info.total);
    } else {
      $("downloadSize").textContent = formatBytes(info.loaded) + " downloaded · total size unavailable";
    }
    $("downloadFile").textContent = info.file || "Downloading model files";
  } else if (info.status === "ready") {
    setProgress(100);
    $("downloadFile").textContent = "Model ready";
  }
}
function updateCount() {
  const words = textInput.value.trim() ? textInput.value.trim().split(/\s+/).length : 0;
  $("wordCount").textContent = words + (words === 1 ? " word" : " words");
}
function setPlaybackButtons(playing) {
  pauseButton.disabled = !audio || audio.ended;
  stopButton.disabled = !audio;
  pauseButton.textContent = playing ? "Ⅱ Pause" : "▶ Resume";
}
function cleanAudio() {
  if (audio) {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    audio = null;
  }
  if (audioUrl) {
    URL.revokeObjectURL(audioUrl);
    audioUrl = null;
  }
  pauseButton.disabled = true;
  stopButton.disabled = true;
  pauseButton.textContent = "Ⅱ Pause";
}

textInput.addEventListener("input", updateCount);
$("speed").addEventListener("input", () => {
  const speed = Number($("speed").value);
  $("speedValue").textContent = speed.toFixed(2).replace(/0+$/,"").replace(/\.$/,"") + "×";
  if (audio) audio.playbackRate = speed;
});

async function loadModel() {
  if (tts) return tts;
  if (loadingPromise) return loadingPromise;

  loadButton.disabled = true;
  playButton.disabled = true;
  setStatus("Loading the AI library…", true);
  setProgress(2);

  loadingPromise = (async () => {
    try {
      if (!KokoroTTSClass) {
        try {
          ({ KokoroTTS: KokoroTTSClass } = await import("https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm"));
        } catch (firstError) {
          console.warn("Primary CDN failed; trying backup CDN.", firstError);
          ({ KokoroTTS: KokoroTTSClass } = await import("https://esm.sh/kokoro-js@1.2.1"));
        }
      }

      const model = "onnx-community/Kokoro-82M-v1.0-ONNX";
      const progress = event => {
        updateDownloadInfo(event);
        if (event && event.file && event.status !== "progress") {
          setStatus("Loading " + event.file + "…", true);
        }
        if (event && event.status === "progress_total") {
          setStatus("Downloading AI model…", true);
        }
      };

      if (navigator.gpu) {
        try {
          setStatus("Trying WebGPU. Downloading the AI model…", true);
          tts = await KokoroTTSClass.from_pretrained(model, {
            dtype: "q8",
            device: "webgpu",
            progress_callback: progress
          });
        } catch (gpuError) {
          console.warn("WebGPU unavailable; falling back to WASM.", gpuError);
          tts = null;
        }
      }

      if (!tts) {
        setStatus("Using compatibility mode (WASM). Downloading the AI model…", true);
        tts = await KokoroTTSClass.from_pretrained(model, {
          dtype: "q8",
          device: "wasm",
          progress_callback: progress
        });
      }

      setProgress(100);
      loadButton.textContent = "✓ Voice loaded";
      playButton.disabled = false;
      setStatus("AI voice ready. Add text and press Generate & play.");
      $("downloadFile").textContent = "Download complete · model cached by browser";
      $("downloadSize").textContent = "100%";
      setProgress(100);
      return tts;
    } catch (error) {
      console.error("Natural TTS loading error:", error);
      tts = null;
      loadButton.disabled = false;
      playButton.disabled = true;
      setProgress(0);
      const detail = error && error.message ? error.message : String(error);
      setStatus("Could not load the AI voice: " + detail);
      throw error;
    } finally {
      loadingPromise = null;
    }
  })();

  return loadingPromise;
}

async function generateAndPlay() {
  const text = textInput.value.trim();
  if (!text) {
    setStatus("Write or paste some text first.");
    textInput.focus();
    return;
  }

  playButton.disabled = true;
  cleanAudio();

  try {
    await loadModel();
    setStatus("Generating speech. Longer text can take a little while…", true);
    setProgress(0);

    const result = await tts.generate(text, {
      voice: $("voice").value,
      speed: 1
    });

    const blob = result.toBlob();
    if (!blob || !blob.size) throw new Error("The model returned an empty audio file.");

    audioUrl = URL.createObjectURL(blob);
    audio = new Audio(audioUrl);
    audio.preload = "auto";
    audio.playbackRate = Number($("speed").value);

    audio.addEventListener("ended", () => {
      setPlaybackButtons(false);
      playButton.disabled = false;
      setStatus("Finished. Press Generate & play to listen again.");
    });
    audio.addEventListener("error", () => {
      setPlaybackButtons(false);
      playButton.disabled = false;
      setStatus("The generated audio could not be played.");
    });

    await audio.play();
    setPlaybackButtons(true);
    playButton.disabled = false;
    setProgress(100);
    setStatus("Playing your generated speech…", true);
  } catch (error) {
    console.error("Natural TTS generation error:", error);
    playButton.disabled = !tts;
    setPlaybackButtons(false);
    const detail = error && error.message ? error.message : String(error);
    setStatus("Speech generation failed: " + detail);
  }
}

loadButton.addEventListener("click", () => loadModel().catch(() => {}));
playButton.addEventListener("click", generateAndPlay);

pauseButton.addEventListener("click", async () => {
  if (!audio) return;
  if (audio.paused) {
    try {
      await audio.play();
      setPlaybackButtons(true);
      setStatus("Playing…", true);
    } catch (error) {
      setStatus("Could not resume audio: " + error.message);
    }
  } else {
    audio.pause();
    setPlaybackButtons(false);
    setStatus("Paused.");
  }
});

stopButton.addEventListener("click", () => {
  cleanAudio();
  playButton.disabled = !tts;
  setStatus("Stopped.");
});

updateCount();