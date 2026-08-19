function flyingPages() {
  const e = new Set();
  const n = new Set();
  const t = document.createElement('link');
  const r =
    t.relList &&
    t.relList.supports &&
    t.relList.supports('prefetch') &&
    window.IntersectionObserver &&
    'isIntersecting' in IntersectionObserverEntry.prototype;
  if (
    (!navigator.connection ||
      (!navigator.connection.saveData &&
        !(navigator.connection.effectiveType || '').includes('2g'))) &&
    r
  ) {
    const o = function(e) {
      let n;
      const t = setTimeout(function() {
        return h();
      }, 5e3);
      ((n = e),
      new Promise(function(e, t) {
        const r = document.createElement('link');
        (r.rel = 'prefetch'),
          (r.href = n),
          (r.onload = e),
          (r.onerror = t),
          document.head.appendChild(r);
      }))
        .catch(function() {
          return h();
        })
        .finally(function() {
          return clearTimeout(t);
        });
    };
    const i = function(t) {
      const r = !!(1 < arguments.length && void 0 !== arguments[1]) && arguments[1];
      if (!n.has(t) && !e.has(t) && window.location.href !== t) {
        for (let i = 0; i < window.FPConfig.ignoreKeywords.length; i++)
          if (t.includes(window.FPConfig.ignoreKeywords[i])) return;
        if (/^(javascript|tel|mailto):.*$/.test(t)) return;
        r ? (o(t), n.add(t)) : e.add(t);
      }
    };
    const c = new IntersectionObserver(function(e) {
      e.forEach(function(e) {
        if (e.isIntersecting) {
          const n = e.target.href;
          i(n, !window.FPConfig.maxRPS);
        }
      });
    });
    let f = null;
    const a = function(e) {
      const t = e.target.closest('a');
      t &&
        t.href &&
        !n.has(t.href) &&
        (f = setTimeout(function() {
          i(t.href, !0);
        }, window.FPConfig.hoverDelay));
    };
    const u = function(e) {
      const t = e.target.closest('a');
      t && t.href && !n.has(t.href) && i(t.href, !0);
    };
    const s = function(e) {
      const t = e.target.closest('a');
      t && t.href && !n.has(t.href) && clearTimeout(f);
    };
    const l =
      window.requestIdleCallback ||
      function(e) {
        const n = Date.now();
        return setTimeout(function() {
          e({
            didTimeout: !1,
            timeRemaining: function() {
              return (0, Math.max)(0, 50 - (Date.now() - n));
            }
          });
        }, 1);
      };
    var h = function() {
      document.querySelectorAll('a').forEach(function(e) {
        return c.unobserve(e);
      }),
        e.clear(),
        document.removeEventListener('mouseover', a, !0),
        document.removeEventListener('mouseout', s, !0),
        document.removeEventListener('touchstart', u, !0);
    };
    setInterval(function() {
      Array.from(e)
        .slice(0, window.FPConfig.maxRPS)
        .forEach(function(t) {
          o(t), n.add(t), e.delete(t);
        });
    }, 1e3),
      l(function() {
        return setTimeout(function() {
          return document.querySelectorAll('a').forEach(function(e) {
            return c.observe(e);
          });
        }, 1e3 * window.FPConfig.delay);
      });
    const d = {capture: !0, passive: !0};
    document.addEventListener('mouseover', a, d),
      document.addEventListener('mouseout', s, d),
      document.addEventListener('touchstart', u, d);
  }
}

flyingPages();
