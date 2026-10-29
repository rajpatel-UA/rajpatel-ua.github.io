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
    if (metaTheme) metaTheme.setAttribute('content', light ? '#faf8f5' : '#0b0b12');
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

  function onScroll() {
    nav.classList.toggle('is-scrolled', window.scrollY > 12);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

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

  /* ---------- Count-up stats ---------- */
  var counters = document.querySelectorAll('[data-count]');
  function countUp(el) {
    var suffix = el.getAttribute('data-suffix') || '';
    var start = null;
    var duration = 1400;
    el.dataset.animating = '1';
    function step(ts) {
      if (!start) start = ts;
      var target = parseInt(el.getAttribute('data-count'), 10);
      var p = motionOff() ? 1 : Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else delete el.dataset.animating;
    }
    requestAnimationFrame(step);
  }
  if (!motionOff() && 'IntersectionObserver' in window) {
    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          countUp(entry.target);
          countObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { countObserver.observe(el); });
  }

  /* ---------- Typewriter (visual only; screen readers get a static list) ---------- */
  var tw = document.getElementById('typewriter');
  var phrases = [
    'Secure MLOps',
    'Agentic AI for cyber defense',
    'Enterprise intrusion response',
    'Spiking neural networks for IDS',
    'Federated defense for healthcare'
  ];

  if (tw) {
    var pi = 0;
    var ci = phrases[0].length;
    var deleting = true;
    var tick = function () {
      if (motionOff()) {
        // Hold the current phrase, fully written, until animations resume.
        tw.textContent = phrases[pi];
        ci = phrases[pi].length;
        deleting = true;
        setTimeout(tick, 800);
        return;
      }
      if (deleting) {
        ci--;
        tw.textContent = phrases[pi].slice(0, ci);
        if (ci <= 0) {
          deleting = false;
          pi = (pi + 1) % phrases.length;
        }
        setTimeout(tick, 32);
      } else {
        ci++;
        tw.textContent = phrases[pi].slice(0, ci);
        if (ci >= phrases[pi].length) {
          deleting = true;
          setTimeout(tick, 2200);
        } else {
          setTimeout(tick, 55 + Math.random() * 40);
        }
      }
    };
    setTimeout(tick, 2200);
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

  /* ---------- Hero network canvas (decorative) ---------- */
  var canvas = document.getElementById('hero-canvas');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0, nodes = [], running = false, rafId = null, heroVisible = true;
  var pointer = { x: -9999, y: -9999 };
  var LINK = 140;

  function color(name) {
    return getComputedStyle(root).getPropertyValue(name).trim();
  }
  var palette = {};
  function readPalette() {
    palette.a = color('--accent');
    palette.b = color('--accent-2');
    palette.s = color('--signal');
    palette.line = root.getAttribute('data-theme') === 'light' ? '40,20,50' : '200,190,230';
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var count = Math.min(90, Math.round((W * H) / 16000));
    nodes = [];
    for (var i = 0; i < count; i++) {
      var r = Math.random();
      nodes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: r < 0.12 ? 2.6 : 1.4,
        c: r < 0.08 ? 'a' : r < 0.14 ? 'b' : r < 0.18 ? 's' : null
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    var still = motionOff();

    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (!still) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
      }

      for (var j = i + 1; j < nodes.length; j++) {
        var m = nodes[j];
        var dx = n.x - m.x, dy = n.y - m.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < LINK * LINK) {
          var alpha = (1 - Math.sqrt(d2) / LINK) * 0.35;
          ctx.strokeStyle = 'rgba(' + palette.line + ',' + alpha + ')';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(m.x, m.y);
          ctx.stroke();
        }
      }

      var pdx = n.x - pointer.x, pdy = n.y - pointer.y;
      var pd = Math.sqrt(pdx * pdx + pdy * pdy);
      if (pd < 180 && !still) {
        ctx.strokeStyle = palette.a;
        ctx.globalAlpha = (1 - pd / 180) * 0.6;
        ctx.beginPath();
        ctx.moveTo(n.x, n.y);
        ctx.lineTo(pointer.x, pointer.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      if (n.c) {
        ctx.fillStyle = palette[n.c];
        ctx.shadowColor = palette[n.c];
        ctx.shadowBlur = 12;
      } else {
        ctx.fillStyle = 'rgba(' + palette.line + ',.55)';
        ctx.shadowBlur = 0;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    if (running) rafId = requestAnimationFrame(draw);
  }

  function start() {
    if (running || motionOff()) return;
    running = true;
    rafId = requestAnimationFrame(draw);
  }
  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
  }

  readPalette();
  resize();
  draw();

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { resize(); if (!running) draw(); }, 150);
  });

  var hero = canvas.parentElement;
  hero.addEventListener('pointermove', function (e) {
    var r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
  });
  hero.addEventListener('pointerleave', function () {
    pointer.x = pointer.y = -9999;
  });

  // Re-read colors when the theme changes.
  new MutationObserver(function () {
    readPalette();
    if (!running) draw();
  }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  // Only animate while the hero is on screen, the tab is visible, and motion is allowed.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
      heroVisible && !document.hidden ? start() : stop();
    }).observe(hero);
  } else {
    start();
  }
  document.addEventListener('visibilitychange', function () {
    !document.hidden && heroVisible ? start() : stop();
  });
  document.addEventListener('motionchange', function () {
    if (motionOff()) { stop(); draw(); } else if (heroVisible && !document.hidden) start();
  });
})();
