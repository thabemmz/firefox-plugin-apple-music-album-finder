# Apple Music Album Finder - Firefox Extension

A Firefox extension that detects albums on music review websites and lets you open them directly in Apple Music.

## How It Works

1. Visit a music review or album page
2. Click the extension icon in the toolbar
3. The extension detects the album using multiple strategies (structured data, meta tags, site-specific selectors, title parsing)
4. Click **Open in Apple Music** to launch the album in the Music app

If automatic detection fails, you can manually search by entering "Artist - Album" in the popup.

## Supported Sites

- Pitchfork
- NME
- Rolling Stone
- Album of the Year
- RateYourMusic
- Stereogum
- Consequence of Sound
- The Quietus
- Oor.nl

The extension also works on any site that uses JSON-LD structured data or Open Graph meta tags for album information.

## Features

- **Multi-strategy album detection** — tries structured data, meta tags, site-specific selectors, and title parsing in order of reliability
- **Smart album matching** — scores results by artist/album similarity and prefers full albums over singles
- **Single-to-album resolution** — when only a single is found, automatically searches the artist's discography for the full album
- **Manual search fallback** — enter "Artist - Album" when automatic detection doesn't find a match
- **Dark theme UI** — styled to match the Apple Music aesthetic

## Installation

### From source

1. Clone this repository
2. Open `about:debugging#/runtime/this-firefox` in Firefox
3. Click **Load Temporary Add-on**
4. Select the `manifest.json` file from the project directory

## Project Structure

```
├── manifest.json   # Extension manifest (Manifest V3)
├── content.js      # Album detection logic (runs on web pages)
├── background.js   # iTunes API integration and album matching
├── popup.html      # Extension popup UI
├── popup.js        # Popup controller and state management
├── popup.css       # Dark theme styling
└── icons/
    ├── icon-48.png
    └── icon-128.png
```

## Permissions

- **activeTab** — access the current tab to detect album information
- **host permission** for `itunes.apple.com` — search the iTunes/Apple Music catalog
