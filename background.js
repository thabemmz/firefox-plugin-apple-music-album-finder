browser.runtime.onMessage.addListener((message) => {
  if (message.action === "search") {
    return searchAppleMusic(message.artist, message.album);
  }
});

async function searchAppleMusic(artist, album) {
  const terms = [artist, album].filter(Boolean).join(" ");
  if (!terms) return { error: "No search terms provided" };

  const url = `https://itunes.apple.com/search?${new URLSearchParams({
    term: terms,
    entity: "album",
    limit: "10",
    country: "us",
  })}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { error: `iTunes API returned ${response.status}` };
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return { error: "No results found" };
    }

    // Try to find the best match
    let match = findBestMatch(data.results, artist, album);

    // If the best match is a single, try to find the full album via artist lookup
    const isSingle = /\s*-\s*Single$/i.test(match.collectionName || "");
    if (isSingle && match.artistId) {
      const fullAlbum = await findFullAlbumByArtist(match.artistId, album);
      if (fullAlbum) {
        match = fullAlbum;
      }
    }

    // Clean up display name (strip " - Single" / " - EP" suffix)
    const displayName = (match.collectionName || "").replace(/\s*-\s*(Single|EP)$/i, "");

    // Convert https://music.apple.com/... to music://music.apple.com/...
    // so macOS opens the Music app directly instead of the browser
    const albumUrl = (match.collectionViewUrl || "")
      .replace(/^https:\/\/music\.apple\.com/, "music://music.apple.com");

    return {
      albumName: displayName,
      artistName: match.artistName,
      albumUrl,
      artworkUrl: match.artworkUrl100
        ? match.artworkUrl100.replace("100x100", "300x300")
        : null,
    };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * When search only returns a single, look up the artist's full discography
 * to find a full album with the same name.
 */
async function findFullAlbumByArtist(artistId, targetAlbum) {
  const normalize = (s) =>
    (s || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  try {
    const url = `https://itunes.apple.com/lookup?${new URLSearchParams({
      id: String(artistId),
      entity: "album",
      limit: "50",
    })}`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.results) return null;

    const target = normalize(targetAlbum);

    // Filter to albums only (skip the artist record which is first), prefer full albums
    for (const result of data.results) {
      if (result.wrapperType !== "collection") continue;

      const isSingle = /\s*-\s*Single$/i.test(result.collectionName || "");
      if (isSingle) continue;

      const rawName = (result.collectionName || "").replace(/\s*-\s*EP$/i, "");
      const name = normalize(rawName);

      if (name === target) {
        return result;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function findBestMatch(results, artist, album) {
  const normalize = (s) =>
    (s || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const targetArtist = normalize(artist);
  const targetAlbum = normalize(album);

  let bestScore = -1;
  let bestResult = results[0];

  for (const result of results) {
    let score = 0;
    const resultArtist = normalize(result.artistName);
    // Strip " - Single" / " - EP" suffix before normalizing for comparison
    const rawAlbumName = (result.collectionName || "").replace(/\s*-\s*(Single|EP)$/i, "");
    const resultAlbum = normalize(rawAlbumName);
    const isSingle = /\s*-\s*Single$/i.test(result.collectionName || "");

    // Exact album match
    if (resultAlbum === targetAlbum) {
      score += 10;
    } else if (resultAlbum.includes(targetAlbum) || targetAlbum.includes(resultAlbum)) {
      score += 5;
    }

    // Exact artist match
    if (targetArtist && resultArtist === targetArtist) {
      score += 10;
    } else if (targetArtist && (resultArtist.includes(targetArtist) || targetArtist.includes(resultArtist))) {
      score += 5;
    }

    // Penalize singles — prefer full albums
    if (isSingle) {
      score -= 5;
    }

    // Bonus for higher track count (likely a full album)
    if (result.trackCount >= 5) {
      score += 3;
    }

    if (score > bestScore) {
      bestScore = score;
      bestResult = result;
    }
  }

  return bestResult;
}
