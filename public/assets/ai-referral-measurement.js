(() => {
  'use strict';

  const EVENT_VERSION = '1';
  const DEDUPE_WINDOW_MS = 30 * 60 * 1000;
  const STORAGE_KEY = 'ci_ai_referral_landing_v1';

  const ASSISTANTS = [
    {
      id: 'chatgpt',
      hosts: ['chatgpt.com', 'chat.openai.com'],
      utmSources: ['chatgpt.com', 'chatgpt'],
      eventName: 'chatgpt_referral_landing',
    },
    {
      id: 'perplexity',
      hosts: ['perplexity.ai', 'www.perplexity.ai'],
      utmSources: ['perplexity', 'perplexity.ai'],
      eventName: 'perplexity_referral_landing',
    },
    {
      id: 'copilot',
      hosts: ['copilot.microsoft.com', 'www.bing.com'],
      utmSources: ['copilot', 'microsoft_copilot'],
      eventName: 'copilot_referral_landing',
    },
    {
      id: 'gemini',
      hosts: ['gemini.google.com'],
      utmSources: ['gemini', 'google_gemini'],
      eventName: 'gemini_referral_landing',
    },
    {
      id: 'claude',
      hosts: ['claude.ai'],
      utmSources: ['claude', 'claude.ai'],
      eventName: 'claude_referral_landing',
    },
  ];

  function normalize(value) {
    return String(value || '').trim().toLowerCase();
  }

  function hostnameFromReferrer(referrer) {
    if (!referrer) return '';
    try {
      return new URL(referrer).hostname.toLowerCase();
    } catch {
      return '';
    }
  }

  function matchesHost(hostname, candidate) {
    return hostname === candidate || hostname.endsWith(`.${candidate}`);
  }

  function detectAssistant(referrerHost, utmSource) {
    for (const assistant of ASSISTANTS) {
      const referrerMatch = assistant.hosts.some((host) => matchesHost(referrerHost, host));
      const utmMatch = assistant.utmSources.includes(utmSource);
      if (referrerMatch || utmMatch) {
        return {
          ...assistant,
          detection: referrerMatch && utmMatch ? 'referrer+utm' : referrerMatch ? 'referrer' : 'utm',
        };
      }
    }
    return null;
  }

  function alreadyMeasured(assistantId, landingPath, now) {
    try {
      const previous = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (!previous) return false;
      return previous.assistant === assistantId &&
        previous.landingPath === landingPath &&
        Number.isFinite(previous.at) &&
        now - previous.at < DEDUPE_WINDOW_MS;
    } catch {
      return false;
    }
  }

  function remember(assistantId, landingPath, now) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        assistant: assistantId,
        landingPath,
        at: now,
      }));
    } catch {
      // Measurement must never interfere with the page if storage is unavailable.
    }
  }

  const params = new URLSearchParams(window.location.search || '');
  const utmSource = normalize(params.get('utm_source'));
  const referrerHost = hostnameFromReferrer(document.referrer);
  const assistant = detectAssistant(referrerHost, utmSource);
  if (!assistant) return;

  const landingPath = window.location.pathname || '/';
  const now = Date.now();
  if (alreadyMeasured(assistant.id, landingPath, now)) return;
  remember(assistant.id, landingPath, now);

  window.dataLayer = window.dataLayer || [];
  const send = typeof window.gtag === 'function'
    ? window.gtag
    : function gtag(){ window.dataLayer.push(arguments); };

  const eventParams = {
    ai_assistant: assistant.id,
    ai_referrer_host: referrerHost || '(none)',
    ai_detection: assistant.detection,
    ai_event_version: EVENT_VERSION,
    landing_path: landingPath,
    referral_utm_source: utmSource || '(none)',
  };

  // Do not override GA4 campaign/source attribution. These events are an audit layer
  // on top of GA4's native session source/medium and page-location dimensions.
  send('event', assistant.eventName, eventParams);
  send('event', 'ai_referral_landing', eventParams);
})();
