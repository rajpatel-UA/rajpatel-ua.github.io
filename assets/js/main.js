(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Animations stop if the OS asks for reduced motion or the visitor presses "Pause animations".
  function motionOff() { return reduceMotion || root.classList.contains('motion-paused'); }

  /* ---------- Screen-reader announcements (plus the visual toast where present) ---------- */
  var announcer = document.createElement('div');
  announcer.className = 'sr-only';
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', 'polite');
  document.body.appendChild(announcer);
  var toast = document.getElementById('toast');
  var toastTimer;

  function announce(msg, showToast) {
    announcer.textContent = '';
    setTimeout(function () { announcer.textContent = msg; }, 60);
    if (showToast && toast) {
      toast.textContent = msg;
      toast.classList.add('is-visible');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toast.classList.remove('is-visible'); }, 2400);
    }
  }

  /* ---------- Theme toggle ---------- */
  var themeBtn = document.getElementById('theme-toggle');
  var metaTheme = document.querySelector('meta[name="theme-color"]');

  function syncTheme() {
    var light = root.getAttribute('data-theme') === 'light';
    if (metaTheme) metaTheme.setAttribute('content', light ? '#f3f7f6' : '#051416');
    if (themeBtn) {
      var label = light ? 'Switch to dark theme' : 'Switch to light theme';
      themeBtn.setAttribute('aria-label', label);
      themeBtn.setAttribute('title', label);
    }
  }
  syncTheme();

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      syncTheme();
      announce(next === 'light' ? 'Light theme on' : 'Dark theme on');
    });
  }

  /* ---------- Pause / play animations ---------- */
  var motionBtn = document.getElementById('motion-toggle');

  function syncMotion() {
    if (motionBtn) motionBtn.setAttribute('aria-pressed', String(root.classList.contains('motion-paused')));
  }
  syncMotion();

  if (motionBtn) {
    motionBtn.addEventListener('click', function () {
      var paused = !root.classList.contains('motion-paused');
      root.classList.toggle('motion-paused', paused);
      localStorage.setItem('motion', paused ? 'paused' : 'playing');
      syncMotion();
      document.dispatchEvent(new CustomEvent('motionchange'));
      announce(paused ? 'Animations paused' : 'Animations playing');
    });
  }

  /* ---------- Nav: scrolled state, mobile menu, active link ---------- */
  var nav = document.getElementById('nav');
  var burger = document.getElementById('nav-burger');
  var links = document.getElementById('nav-links');

  /* ---------- Scroll work, batched into one animation frame ---------- */
  var heroScene = document.querySelector('.hero--scene');
  var nativeScroll = window.CSS && CSS.supports && CSS.supports('animation-timeline: view()');
  var desktop = window.matchMedia('(min-width: 1200px)');
  var ticking = false;

  function onFrame() {
    ticking = false;
    var y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 12);
    // Fallback for browsers without scroll-driven animations: drive the hero scene with --p (0 → 1).
    if (heroScene && !nativeScroll && desktop.matches && !motionOff()) {
      var range = heroScene.offsetHeight - window.innerHeight;
      var p = range > 0 ? Math.min(Math.max(y / range, 0), 1) : 0;
      heroScene.style.setProperty('--p', p.toFixed(4));
    }
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(onFrame); }
  }
  onFrame();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  function setMenu(open) {
    links.classList.toggle('is-open', open);
    nav.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  burger.addEventListener('click', function () {
    setMenu(burger.getAttribute('aria-expanded') !== 'true');
  });
  links.addEventListener('click', function (e) {
    if (e.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      burger.focus();
    }
  });

  var navAnchors = Array.prototype.slice.call(links.querySelectorAll('a[href^="#"]'));
  var sections = navAnchors
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if ('IntersectionObserver' in window) {
    var activeObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navAnchors.forEach(function (a) {
          var on = a.getAttribute('href') === '#' + entry.target.id;
          a.classList.toggle('is-active', on);
          if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { activeObserver.observe(s); });
  }

  /* ---------- Links that open a new tab say so ---------- */
  document.querySelectorAll('a[target="_blank"]').forEach(function (a) {
    if (a.querySelector('.sr-only')) return;
    var note = document.createElement('span');
    note.className = 'sr-only';
    note.textContent = ' (opens in a new tab)';
    a.appendChild(note);
  });

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll('.reveal');

  document.querySelectorAll('.themes, .principles, .hero__text, .pubs, .timeline, .projects, .pgrid, .service').forEach(function (group) {
    Array.prototype.forEach.call(group.querySelectorAll(':scope > .reveal'), function (el, i) {
      el.style.setProperty('--delay', Math.min(i * 0.08, 0.4) + 's');
    });
  });

  if ('IntersectionObserver' in window && !motionOff()) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { revealObserver.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Hero photo: fade in once it has decoded ---------- */
  var heroEl = document.querySelector('.hero');
  var heroImg = document.querySelector('.hero__subject img');
  if (heroEl && heroImg) {
    var shown = false;
    var show = function () { if (!shown) { shown = true; heroEl.classList.add('is-ready'); } };
    var decodeThenShow = function () {
      if (heroImg.decode) heroImg.decode().then(show, show); else show();
    };
    if (heroImg.complete && heroImg.naturalWidth) decodeThenShow();
    else { heroImg.addEventListener('load', decodeThenShow); heroImg.addEventListener('error', show); }
    setTimeout(show, 2500);   // never leave the photo hidden on a slow connection
  }

  /* ---------- Publication filters ---------- */
  var filters = document.querySelectorAll('.filter');
  var pubs = document.querySelectorAll('.pub');
  var pubStatus = document.getElementById('pub-status');

  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var f = btn.getAttribute('data-filter');
      var shown = 0;
      filters.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      pubs.forEach(function (p) {
        var types = p.getAttribute('data-type').split(' ');
        var show = f === 'all' || types.indexOf(f) !== -1;
        p.classList.toggle('is-hidden', !show);
        if (show) { p.classList.add('is-visible'); shown++; }
      });
      if (pubStatus) pubStatus.textContent = 'Showing ' + shown + ' of ' + pubs.length + ' publications';
    });
  });

  /* ---------- Spotlight hover on research cards ---------- */
  document.querySelectorAll('.theme').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- Copy email ---------- */
  var copyBtn = document.getElementById('copy-email');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var email = copyBtn.getAttribute('data-email');
      if (!navigator.clipboard) { window.location.href = 'mailto:' + email; return; }
      navigator.clipboard.writeText(email).then(function () {
        copyBtn.classList.add('is-copied');
        announce('Email address copied to clipboard', true);
        setTimeout(function () { copyBtn.classList.remove('is-copied'); }, 2000);
      });
    });
  }

  /* ---------- Copy buttons (bio) ---------- */
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var src = document.querySelector(btn.getAttribute('data-copy'));
      if (!src || !navigator.clipboard) return;
      var text = Array.prototype.map.call(src.querySelectorAll('p'), function (p) {
        return p.textContent.replace(/\s+/g, ' ').trim();
      }).join('\n\n');
      navigator.clipboard.writeText(text).then(function () {
        var label = btn.textContent;
        btn.textContent = 'Copied';
        btn.classList.add('is-copied');
        announce('Bio copied to clipboard', true);
        setTimeout(function () { btn.textContent = label; btn.classList.remove('is-copied'); }, 1800);
      });
    });
  });

  /* ---------- Project dialogs ---------- */
  document.querySelectorAll('[data-dialog]').forEach(function (btn) {
    var dlg = document.getElementById(btn.getAttribute('data-dialog'));
    if (!dlg || typeof dlg.showModal !== 'function') return;
    btn.addEventListener('click', function () { dlg.showModal(); });
  });
  document.querySelectorAll('dialog.dialog').forEach(function (dlg) {
    dlg.addEventListener('click', function (e) {
      if (e.target.closest('.dialog__close')) { dlg.close(); return; }
      if (e.target !== dlg) return;
      // A click on the dialog element itself outside its box means the backdrop was clicked.
      var r = dlg.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dlg.close();
    });
  });

  /* ---------- Live Google Scholar numbers (refreshed weekly by a GitHub Action) ---------- */
  var scholarTargets = document.querySelectorAll('[data-scholar]');
  if ((scholarTargets.length || pubs.length) && window.fetch) {
    fetch('assets/data/scholar.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d) return;
        scholarTargets.forEach(function (el) {
          var v = d[el.getAttribute('data-scholar')];
          if (typeof v !== 'number') return;
          el.setAttribute('data-count', v);
          if (!el.dataset.animating) el.textContent = v + (el.getAttribute('data-suffix') || '');
        });

        var note = document.getElementById('scholar-note');
        if (note && d.updated) {
          var when = new Date(d.updated + 'T00:00:00');
          note.textContent = 'Google Scholar · updated ' +
            when.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }

        var norm = function (s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, ''); };
        var cites = {};
        (d.papers || []).forEach(function (p) { cites[norm(p.title)] = p.citations; });
        pubs.forEach(function (li) {
          var title = li.querySelector('h3');
          var meta = li.querySelector('.pub__meta');
          if (!title || !meta || meta.querySelector('.pub__cites')) return;
          var clean = title.cloneNode(true);
          clean.querySelectorAll('.sr-only').forEach(function (n) { n.remove(); });
          var n = cites[norm(clean.textContent)];
          if (!n) return;
          var badge = document.createElement('span');
          badge.className = 'pub__cites';
          badge.textContent = 'Cited by ' + n;
          meta.appendChild(badge);
        });
      })
      .catch(function () { /* keep the static numbers */ });
  }

  /* ---------- Footer year ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
