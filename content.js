(() => {
  "use strict";

  // --- Detection strategies, tried in priority order ---

  function detectFromJsonLd() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          // Direct MusicAlbum
          if (item["@type"] === "MusicAlbum" && item.name) {
            return {
              album: item.name,
              artist: item.byArtist?.name || null,
            };
          }
          // Review of a MusicAlbum
          if (item["@type"] === "Review" && item.itemReviewed) {
            const reviewed = item.itemReviewed;
            if (reviewed["@type"] === "MusicAlbum" && reviewed.name) {
              return {
                album: reviewed.name,
                artist: reviewed.byArtist?.name || null,
              };
            }
          }
          // Oor.nl pattern: JSON-LD name like "Recensie: Artist - Album"
          if (item.name && /^recensie:\s+/i.test(item.name)) {
            const cleaned = item.name.replace(/^recensie:\s+/i, "");
            const parts = cleaned.split(/\s+-\s+/);
            if (parts.length >= 2) {
              return { artist: parts[0].trim(), album: parts.slice(1).join(" - ").trim() };
            }
          }
        }
      } catch {
        // ignore malformed JSON-LD
      }
    }
    return null;
  }

  function detectFromOpenGraph() {
    const ogTitle = document.querySelector('meta[property="og:title"]')?.content;
    const ogDesc = document.querySelector('meta[property="og:description"]')?.content;
    const musicAlbum = document.querySelector('meta[property="music:album"]')?.content;
    const musicMusician = document.querySelector('meta[property="music:musician"]')?.content;

    if (musicAlbum) {
      return { album: musicAlbum, artist: musicMusician || null };
    }

    if (ogTitle) {
      const parsed = parseArtistAlbumString(ogTitle);
      if (parsed) return parsed;
    }

    if (ogDesc) {
      const parsed = parseArtistAlbumString(ogDesc);
      if (parsed) return parsed;
    }

    return null;
  }

  function detectFromSiteSpecific() {
    const host = location.hostname;

    // Pitchfork
    if (host.includes("pitchfork.com")) {
      const artist =
        document.querySelector('[data-testid="SplitScreenContentHeaderArtist"]')?.textContent?.trim() ||
        document.querySelector(".SplitScreenContent-prefix")?.textContent?.trim();
      const album =
        document.querySelector('[data-testid="SplitScreenContentHeaderReviewTitle"]')?.textContent?.trim() ||
        document.querySelector(".SplitScreenContent-mainContent h1")?.textContent?.trim();
      if (artist && album) return { artist, album };
    }

    // NME
    if (host.includes("nme.com")) {
      const title = document.querySelector(".tdb-title-text")?.textContent?.trim() ||
        document.querySelector("h1.entry-title")?.textContent?.trim();
      if (title) {
        const parsed = parseArtistAlbumString(title);
        if (parsed) return parsed;
      }
    }

    // Rolling Stone
    if (host.includes("rollingstone.com")) {
      const title = document.querySelector("h1")?.textContent?.trim();
      if (title) {
        const parsed = parseArtistAlbumString(title);
        if (parsed) return parsed;
      }
    }

    // Album of the Year
    if (host.includes("albumoftheyear.org")) {
      const artist = document.querySelector(".artist-title a")?.textContent?.trim();
      const album = document.querySelector(".albumTitle")?.textContent?.trim();
      if (artist && album) return { artist, album };
    }

    // Rate Your Music
    if (host.includes("rateyourmusic.com")) {
      const album = document.querySelector(".album_title")?.textContent?.trim();
      const artist = document.querySelector("span.album_artist_small a, a.artist")?.textContent?.trim();
      if (artist && album) return { artist, album };
    }

    // Oor.nl
    if (host.includes("oor.nl")) {
      const headings = document.querySelectorAll(".elementor-heading-title");
      if (headings.length >= 2) {
        const artist = headings[0]?.textContent?.trim();
        const album = headings[1]?.textContent?.trim();
        if (artist && album) return { artist, album };
      }
    }

    // Stereogum
    if (host.includes("stereogum.com")) {
      const title = document.querySelector("h1.headline")?.textContent?.trim();
      if (title) {
        const parsed = parseArtistAlbumString(title);
        if (parsed) return parsed;
      }
    }

    // Consequence of Sound
    if (host.includes("consequence.net") || host.includes("consequenceofsound.net")) {
      const title = document.querySelector("h1.entry-title, h1.single-title")?.textContent?.trim();
      if (title) {
        const parsed = parseArtistAlbumString(title);
        if (parsed) return parsed;
      }
    }

    // The Quietus
    if (host.includes("thequietus.com")) {
      const title = document.querySelector("h1")?.textContent?.trim();
      if (title) {
        const parsed = parseArtistAlbumString(title);
        if (parsed) return parsed;
      }
    }

    return null;
  }

  function detectFromPageTitle() {
    const title = document.title;
    if (!title) return null;
    return parseArtistAlbumString(title);
  }

  // --- Helpers ---

  function parseArtistAlbumString(str) {
    if (!str) return null;

    // Remove common suffixes: "Review", "Album Review", "| Site Name", "- Site Name"
    let cleaned = str
      .replace(/\s*\|\s*.+$/, "")
      .replace(/\s*[-–—]\s*(album\s+)?review.*$/i, "")
      .replace(/\s*review$/i, "")
      .replace(/^review:\s*/i, "")
      .replace(/^recensie:\s*/i, "")
      .trim();

    // Pattern: Artist - Album
    const dashMatch = cleaned.match(/^(.+?)\s*[-–—]\s+(.+)$/);
    if (dashMatch) {
      return { artist: dashMatch[1].trim(), album: dashMatch[2].trim() };
    }

    // Pattern: "Album" by Artist
    const byMatch = cleaned.match(/^['"\u201C\u201D]?(.+?)['"\u201C\u201D]?\s+by\s+(.+)$/i);
    if (byMatch) {
      return { artist: byMatch[2].trim(), album: byMatch[1].trim() };
    }

    // Pattern: Artist: Album
    const colonMatch = cleaned.match(/^(.+?):\s+(.+)$/);
    if (colonMatch) {
      return { artist: colonMatch[1].trim(), album: colonMatch[2].trim() };
    }

    return null;
  }

  function stripQuotes(str) {
    return str.replace(/^['"\u201C\u201D]+|['"\u201C\u201D]+$/g, "").trim();
  }

  function detect() {
    const strategies = [
      detectFromJsonLd,
      detectFromOpenGraph,
      detectFromSiteSpecific,
      detectFromPageTitle,
    ];

    for (const strategy of strategies) {
      const result = strategy();
      if (result && result.album) {
        return {
          artist: result.artist ? stripQuotes(result.artist) : null,
          album: stripQuotes(result.album),
        };
      }
    }

    return null;
  }

  // --- Message listener ---

  browser.runtime.onMessage.addListener((message) => {
    if (message.action === "detect") {
      return Promise.resolve(detect());
    }
  });
})();
