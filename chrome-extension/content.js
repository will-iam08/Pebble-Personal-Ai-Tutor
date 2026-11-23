// Pebble Study Tutor — Active Page & YouTube Transcript Extractor

(function initPebbleContentReader() {
  if (window.__pebbleContentReaderLoaded) return;
  window.__pebbleContentReaderLoaded = true;

  const NOISE_SELECTORS = [
    'script',
    'style',
    'noscript',
    'nav',
    'header',
    'footer',
    'aside',
    'iframe',
    'svg',
    '[role="navigation"]',
    '[role="banner"]',
    '[role="contentinfo"]',
    '.sidebar',
    '.advertisement',
    '.ads',
    '.cookie-banner',
  ];

  function formatTimestamp(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function isYouTubeWatchPage() {
    return (
      /(^|\.)youtube\.com$/i.test(window.location.hostname) &&
      window.location.pathname === '/watch'
    );
  }

  function extractCaptionTracksFromHtml() {
    const scripts = Array.from(document.querySelectorAll('script'));
    for (const s of scripts) {
      const content = s.textContent || '';
      if (!content.includes('"captionTracks"')) continue;
      const match = content.match(/"captionTracks"\s*:\s*(\[[\s\S]*?\])\s*,\s*"/);
      if (!match) continue;
      try {
        const parsed = JSON.parse(match[1]);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // Keep scanning scripts
      }
    }
    return [];
  }

  async function extractYouTubeTranscript() {
    const titleEl =
      document.querySelector('h1.ytd-watch-metadata yt-formatted-string') ||
      document.querySelector('h1.title') ||
      document.querySelector('meta[name="title"]');
    const videoTitle = (
      titleEl?.textContent ||
      titleEl?.getAttribute?.('content') ||
      document.title.replace(/\s*-\s*YouTube$/i, '') ||
      'YouTube Lecture'
    ).trim();

    // 1. If the user already opened YouTube's transcript panel, read it directly from DOM
    const domSegments = Array.from(document.querySelectorAll('ytd-transcript-segment-renderer'));
    if (domSegments.length > 3) {
      const lines = domSegments
        .map((seg) => {
          const ts = (seg.querySelector('.segment-timestamp')?.textContent || '').trim();
          const txt = (seg.querySelector('.segment-text')?.textContent || '').trim();
          return txt ? (ts ? `[${ts}] ${txt}` : txt) : '';
        })
        .filter(Boolean);
      const joined = lines.join('\n').slice(0, 36000);
      if (joined.length >= 40) {
        return {
          ok: true,
          kind: 'youtube',
          title: `YouTube: ${videoTitle}`,
          url: window.location.href,
          text: joined,
          wordCount: joined.split(/\s+/).filter(Boolean).length,
        };
      }
    }

    // 2. Otherwise read captionTracks embedded in ytInitialPlayerResponse (same-origin)
    const tracks = extractCaptionTracksFromHtml();
    if (tracks.length > 0) {
      const preferred =
        tracks.find((t) => /^en/i.test(t.languageCode || '') && t.kind !== 'asr') ||
        tracks.find((t) => /^en/i.test(t.languageCode || '')) ||
        tracks[0];

      if (preferred?.baseUrl) {
        try {
          const url = new URL(preferred.baseUrl);
          url.searchParams.set('fmt', 'json3');
          const res = await fetch(url.toString());
          if (res.ok) {
            const json = await res.json();
            const lines = [];
            for (const ev of json.events || []) {
              if (!Array.isArray(ev.segs)) continue;
              const text = ev.segs
                .map((seg) => seg.utf8 || '')
                .join('')
                .replace(/\s+/g, ' ')
                .trim();
              if (!text) continue;
              const ts = typeof ev.tStartMs === 'number' ? `[${formatTimestamp(ev.tStartMs)}] ` : '';
              lines.push(`${ts}${text}`);
            }
            const joined = lines.join('\n').slice(0, 36000);
            if (joined.length >= 40) {
              return {
                ok: true,
                kind: 'youtube',
                title: `YouTube: ${videoTitle}`,
                url: window.location.href,
                text: joined,
                wordCount: joined.split(/\s+/).filter(Boolean).length,
              };
            }
          }
        } catch {
          // Fall through to description fallback
        }
      }
    }

    // 3. Fallback: description snippet if video has no captions
    const desc = (
      document.querySelector('#description-inline-expander')?.textContent ||
      document.querySelector('meta[name="description"]')?.getAttribute('content') ||
      ''
    ).trim();

    if (desc.length >= 60) {
      const text = `Video Title: ${videoTitle}\n\nNote: Captions were unavailable for this video; extracted video description instead.\n\n${desc}`.slice(
        0,
        36000
      );
      return {
        ok: true,
        kind: 'youtube',
        title: `YouTube: ${videoTitle}`,
        url: window.location.href,
        text,
        wordCount: text.split(/\s+/).filter(Boolean).length,
      };
    }

    return {
      ok: false,
      error:
        'Could not find captions for this YouTube video. Try opening "Show transcript" on YouTube and clicking Read Active Page again, or paste the transcript in Notes.',
    };
  }

  function extractMainText() {
    const rootCandidate =
      document.querySelector('article') ||
      document.querySelector('main') ||
      document.querySelector('[role="main"]') ||
      document.body;

    if (!rootCandidate) {
      return { ok: false, error: 'No readable document body found.' };
    }

    const clone = rootCandidate.cloneNode(true);
    for (const selector of NOISE_SELECTORS) {
      clone.querySelectorAll(selector).forEach((el) => el.remove());
    }

    const rawText = (clone.innerText || clone.textContent || '')
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (rawText.length < 40) {
      return {
        ok: false,
        error: 'Very little text was found on this tab. Try taking a screenshot, uploading a PDF, or pasting notes instead.',
      };
    }

    const clipped = rawText.slice(0, 36000);
    const wordCount = clipped.split(/\s+/).filter(Boolean).length;

    return {
      ok: true,
      kind: 'page',
      title: document.title || 'Untitled Web Page',
      url: window.location.href,
      text: clipped,
      wordCount,
    };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'READ_PAGE_CONTENT') {
      if (isYouTubeWatchPage()) {
        extractYouTubeTranscript()
          .then((result) => sendResponse(result))
          .catch(() => sendResponse(extractMainText()));
        return true;
      }
      sendResponse(extractMainText());
    }
    return false;
  });
})();
