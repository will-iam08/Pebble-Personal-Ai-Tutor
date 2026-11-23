// Pebble Study Tutor — Active Page Content Extractor

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
        error: 'Very little text was found on this tab. Try uploading a PDF or pasting notes instead.',
      };
    }

    const clipped = rawText.slice(0, 36000);
    const wordCount = clipped.split(/\s+/).filter(Boolean).length;

    return {
      ok: true,
      title: document.title || 'Untitled Web Page',
      url: window.location.href,
      text: clipped,
      wordCount,
    };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'READ_PAGE_CONTENT') {
      sendResponse(extractMainText());
    }
    return false;
  });
})();
