/**
 *
 * @param settings
 * @return {boolean}
 */
function shouldDisplayOnPage(settings) {
  if (!settings) return true;
  const {displayMode} = settings;
  if (!displayMode || displayMode === 'all') return true;

  const pathname = window.location.pathname;
  const urls = (displayMode === 'include' ? settings.includeUrls : settings.excludeUrls) || '';
  const urlList = urls
    .split('\n')
    .map(u => u.trim())
    .filter(Boolean);
  const matched = urlList.some(u => {
    if (u === '/') return pathname === '/';
    return pathname === u || pathname.startsWith(u);
  });

  switch (displayMode) {
    case 'include':
      return matched;
    case 'exclude':
      return !matched;
    default:
      return true;
  }
}

(function() {
  window._AOV_CD_LOG = window._AOV_CD_LOG || [];
  /**
   * Append a debug entry to window._AOV_CD_LOG.
   * Inspect in the storefront console with: console.table(window._AOV_CD_LOG)
   *
   * @param {string} event - event name (e.g. 'try_load_drawer', 'bundle_injected')
   * @param {Object} [data] - extra fields merged into the entry
   * @return {void}
   */
  const log = (event, data) => window._AOV_CD_LOG.push({t: Date.now(), event, ...(data || {})});

  /**
   * @param {string} trigger - 'immediate' or 'dom_ready'
   * @return {boolean} true if handled (injected or aborted intentionally), false to defer
   */
  function tryLoadDrawer(trigger) {
    log('try_load_drawer', {
      trigger,
      shop: window.Shopify && window.Shopify.shop,
      pathname: window.location.pathname,
      hasGlobal: !!window.AVADA_CART_DRAWER
    });

    const settings = window.AVADA_CART_DRAWER && window.AVADA_CART_DRAWER.settings;
    const status = settings && settings.status;
    const urlParams = new URLSearchParams(window.location.search);
    const hasTestMode = urlParams.has('test_mode');
    let sessionTestMode = false;
    try {
      sessionTestMode = !!sessionStorage.getItem('aov-cart-drawer-test-mode');
    } catch (e) {}

    log('state', {
      trigger,
      hasSettings: !!settings,
      status,
      displayMode: settings && settings.displayMode,
      includeUrls: settings && settings.includeUrls,
      excludeUrls: settings && settings.excludeUrls,
      hasTestMode,
      sessionTestMode
    });

    if (!settings && trigger === 'immediate') {
      log('defer_to_dom_ready');
      return false;
    }

    if (!status && !hasTestMode && !sessionTestMode) {
      log('abort_status_off', {trigger});
      return true;
    }
    if (!shouldDisplayOnPage(settings)) {
      log('abort_display_mode', {
        trigger,
        pathname: window.location.pathname,
        displayMode: settings && settings.displayMode
      });
      return true;
    }

    // const BASE_URL = 'https://aov-cart-drawer-staging-1.firebaseapp.com/scripttag';
    // const BASE_URL = 'https://aov-cart-drawer-staging-2.firebaseapp.com/scripttag';
    // const BASE_URL = 'https://aov-cart-drawer-staging-3.firebaseapp.com/scripttag';
    const BASE_URL = 'https://static-cd.aov.ai/scripttag';
    const scriptElement = document.createElement('script');
    scriptElement.type = 'text/javascript';
    scriptElement.async = !0;
    scriptElement.src = BASE_URL + '/aov-cart-drawer.min.js?v=' + new Date().getTime();
    scriptElement.onload = () => log('bundle_loaded', {src: scriptElement.src});
    scriptElement.onerror = () => log('bundle_load_error', {src: scriptElement.src});
    const firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode.insertBefore(scriptElement, firstScript);
    log('bundle_injected', {trigger, src: scriptElement.src});
    return true;
  }

  if (tryLoadDrawer('immediate')) return;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => tryLoadDrawer('dom_ready'), {once: true});
  } else {
    tryLoadDrawer('dom_ready');
  }
})();
