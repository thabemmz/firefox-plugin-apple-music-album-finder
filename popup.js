const stateScanning = document.getElementById("state-scanning");
const stateFound = document.getElementById("state-found");
const stateNotFound = document.getElementById("state-not-found");
const stateError = document.getElementById("state-error");

const artwork = document.getElementById("artwork");
const albumName = document.getElementById("album-name");
const artistName = document.getElementById("artist-name");
const openBtn = document.getElementById("open-btn");
const errorText = document.getElementById("error-text");
const manualInput = document.getElementById("manual-input");
const manualBtn = document.getElementById("manual-btn");

function showState(state) {
  stateScanning.classList.add("hidden");
  stateFound.classList.add("hidden");
  stateNotFound.classList.add("hidden");
  stateError.classList.add("hidden");
  state.classList.remove("hidden");
}

async function searchAndDisplay(artist, album) {
  showState(stateScanning);

  try {
    const result = await browser.runtime.sendMessage({
      action: "search",
      artist,
      album,
    });

    if (result.error) {
      showState(stateNotFound);
      manualInput.value = [artist, album].filter(Boolean).join(" - ");
      return;
    }

    albumName.textContent = result.albumName;
    artistName.textContent = result.artistName;
    openBtn.dataset.url = result.albumUrl;

    if (result.artworkUrl) {
      artwork.src = result.artworkUrl;
      artwork.classList.remove("hidden");
    } else {
      artwork.classList.add("hidden");
    }

    showState(stateFound);
  } catch (err) {
    errorText.textContent = `Error: ${err.message}`;
    showState(stateError);
  }
}

// Main: ask content script for album detection
async function init() {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    const detection = await browser.tabs.sendMessage(tab.id, { action: "detect" });

    if (detection && detection.album) {
      await searchAndDisplay(detection.artist, detection.album);
    } else {
      showState(stateNotFound);
    }
  } catch (err) {
    // Content script not loaded on this page
    showState(stateNotFound);
  }
}

// Open in Apple Music app via music:// URL scheme
openBtn.addEventListener("click", (e) => {
  e.preventDefault();
  const url = openBtn.dataset.url;
  if (url) {
    browser.tabs.create({ url });
  }
});

// Manual search
manualBtn.addEventListener("click", () => {
  const value = manualInput.value.trim();
  if (!value) return;

  const parts = value.split(/\s*[-–—]\s+/);
  if (parts.length >= 2) {
    searchAndDisplay(parts[0], parts.slice(1).join(" - "));
  } else {
    searchAndDisplay(null, value);
  }
});

manualInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") manualBtn.click();
});

init();
