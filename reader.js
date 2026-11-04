(() => {
"use strict";
const $ = id => document.getElementById(id);
const synth = window.speechSynthesis;
if (!synth || !("SpeechSynthesisUtterance" in window)) {
  const b = $("readerOpen");
  if (b) b.addEventListener("click", () => alert("Read aloud is not supported by this browser. Try Microsoft Edge or Chrome."));
  return;
}
const dialog = $("readerDialog"), textBox = $("readerText"), voiceSelect = $("readerVoice");
let voices = [], chunks = [], index = 0, speaking = false, paused = false, runId = 0;
function status(message) { $("readerStatus").textContent = message; }
function refreshVoices() {
  voices = synth.getVoices() || [];
  const old = voiceSelect.value;
  voiceSelect.replaceChildren();
  const sorted = [...voices].sort((a,b) => {
    const score = v => (/natural|online|neural|enhanced/i.test(v.name) ? 4 : /microsoft|google/i.test(v.name) ? 2 : 0) + (v.lang.toLowerCase().startsWith("en") ? 1 : 0);
    return score(b)-score(a) || a.name.localeCompare(b.name);
  });
  if (!sorted.length) {
    const o = document.createElement("option"); o.textContent = "No voices found"; voiceSelect.append(o); return;
  }
  sorted.forEach(v => {
    const o = document.createElement("option");
    o.value = v.voiceURI;
    o.textContent = v.name + " — " + v.lang + (v.default ? " (Default)" : "");
    voiceSelect.append(o);
  });
  if (sorted.some(v => v.voiceURI === old)) voiceSelect.value = old;
  else {
    const preferred = sorted.find(v => /natural|online|neural|enhanced/i.test(v.name)) || sorted.find(v => v.lang.toLowerCase().startsWith("en")) || sorted[0];
    voiceSelect.value = preferred.voiceURI;
  }
}
if (synth.onvoiceschanged !== undefined) synth.addEventListener("voiceschanged", refreshVoices);
refreshVoices();
$("readerRate").addEventListener("input", e => $("readerRateLabel").textContent = Number(e.target.value).toFixed(2) + "×");
function selectedText() { return String(window.getSelection ? window.getSelection() : "").trim(); }
function pageText() {
  const root = $("homeView");
  if (!root || root.hidden) return "";
  const clone = root.cloneNode(true);
  clone.querySelectorAll("button,input,select,textarea,script,style,.footer,.hero-art,.category-bar,.advanced-filters").forEach(n => n.remove());
  return (clone.innerText || clone.textContent || "").replace(/\n{3,}/g,"\n\n").trim();
}
function splitText(value) {
  return value.replace(/\s+/g," ").match(/[^.!?;:]+[.!?;:]+[”’"')\]]*|[^.!?;:]+$/g)?.map(s=>s.trim()).filter(Boolean) || [];
}
function setButtons(active) {
  $("readerPlay").disabled = active;
  $("readerPause").disabled = !active;
  $("readerStop").disabled = !active;
}
function stop() {
  runId++; synth.cancel(); speaking = false; paused = false; chunks = []; index = 0;
  setButtons(false); status("Stopped.");
}
function speakNext(id) {
  if (id !== runId || index >= chunks.length) {
    if (id === runId) { speaking = false; paused = false; setButtons(false); status("Finished reading."); }
    return;
  }
  const utterance = new SpeechSynthesisUtterance(chunks[index]);
  const voice = voices.find(v => v.voiceURI === voiceSelect.value);
  if (voice) { utterance.voice = voice; utterance.lang = voice.lang; }
  utterance.rate = Number($("readerRate").value);
  utterance.pitch = 1;
  utterance.onstart = () => status("Reading sentence " + (index+1) + " of " + chunks.length + "…");
  utterance.onend = () => { if (id !== runId) return; index++; speakNext(id); };
  utterance.onerror = e => { if (id !== runId || e.error === "canceled" || e.error === "interrupted") return; speaking = false; setButtons(false); status("Voice playback stopped: " + e.error); };
  synth.speak(utterance);
}
function play() {
  const source = textBox.value.trim() || selectedText();
  if (!source) { status("Add text, select text on the page, or choose Use page text."); return; }
  stop(); chunks = splitText(source);
  if (!chunks.length) { status("There is no readable text."); return; }
  index = 0; speaking = true; paused = false; const id = runId;
  setButtons(true); speakNext(id);
}
$("readerOpen").addEventListener("click", () => {
  dialog.hidden = false;
  const selection = selectedText();
  if (selection) textBox.value = selection;
  else if (!textBox.value.trim()) textBox.value = pageText();
  refreshVoices(); $("readerClose").focus();
});
$("readerClose").addEventListener("click", () => { stop(); dialog.hidden = true; $("readerOpen").focus(); });
$("readerPage").addEventListener("click", () => { textBox.value = pageText(); status("Page text loaded. Press Play when ready."); });
$("readerPlay").addEventListener("click", play);
$("readerPause").addEventListener("click", () => {
  if (synth.speaking && !synth.paused) { synth.pause(); paused = true; status("Paused."); $("readerPause").textContent = "▶ Resume"; }
  else if (synth.paused) { synth.resume(); paused = false; status("Reading…"); $("readerPause").textContent = "Ⅱ Pause"; }
});
$("readerStop").addEventListener("click", stop);
$("readerDialog").addEventListener("click", e => { if (e.target === dialog) { stop(); dialog.hidden = true; } });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !dialog.hidden) { stop(); dialog.hidden = true; } });
})();