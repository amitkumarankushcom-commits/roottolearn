// frontend/assets/js/ads.js — Ad management (free users only)

const ADS_CONFIG = {
  publisherId: 'ca-pub-2621988340773883',
};

function loadAdSenseScript() {
  if (document.querySelector('script[src*="adsbygoogle"]')) return;
  const s = document.createElement('script');
  s.src   = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS_CONFIG.publisherId}`;
  s.async = true;
  s.crossOrigin = 'anonymous';
  document.head.appendChild(s);
}

// Call after user state is known
function initAds(userPlan) {
  const isFree = !userPlan || userPlan === 'free';

  // Show/hide all ad slots
  document.querySelectorAll('.ad-slot').forEach(el => {
    el.style.display = isFree ? 'block' : 'none';
  });

  // Show/hide upgrade prompts
  document.querySelectorAll('.upgrade-bar').forEach(el => {
    el.style.display = isFree ? 'flex' : 'none';
  });

  if (isFree) {
    loadAdSenseScript();
    // Push each ad unit after script loads
    setTimeout(() => {
      document.querySelectorAll('.adsbygoogle').forEach(ad => {
        if (!ad.dataset.adsbygoogleStatus) {
          try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
        }
      });
    }, 1200);
  }
}