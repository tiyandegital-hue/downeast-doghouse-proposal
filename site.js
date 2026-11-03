/* Downeast Dog House — interactions.
   One paused-state machine per component; every component degrades
   gracefully without JS (content is visible by default). */
(function () {
  'use strict';

  /* ---- Footer year ---- */
  var yearEls = document.querySelectorAll('#year');
  yearEls.forEach(function (el) { el.textContent = String(new Date().getFullYear()); });

  /* ---- Mobile nav (state machine: open/closed, esc closes) ---- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    var setOpen = function (open) {
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    toggle.addEventListener('click', function () {
      setOpen(!nav.classList.contains('open'));
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        setOpen(false);
        toggle.focus();
      }
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
  }

  /* ---- Entrance reveals: IntersectionObserver, plays once, to completion ---- */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    // No observer (or no JS-driven CSS): content must stay visible.
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---- Menu board tabs (menu.html only) ---- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.menu-tab'));
  if (tabs.length) {
    var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
    var activate = function (tab, moveFocus) {
      tabs.forEach(function (t) {
        var selected = t === tab;
        t.setAttribute('aria-selected', String(selected));
        t.tabIndex = selected ? 0 : -1;
        if (moveFocus && selected) t.focus();
      });
      panels.forEach(function (p) {
        if (!p) return;
        var show = p.id === tab.getAttribute('aria-controls');
        p.classList.toggle('active', show);
        if (show) p.removeAttribute('hidden'); else p.setAttribute('hidden', '');
      });
    };
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { activate(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === 'Home') next = tabs[0];
        if (e.key === 'End') next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); activate(next, true); }
      });
    });
  }

  /* ---- The Easternmost Day Trip planner (find-us.html only) ---- */
  var steps = Array.prototype.slice.call(document.querySelectorAll('.step[data-step]'));
  var summary = document.getElementById('dayplan-summary');
  var copyBtn = document.getElementById('copy-plan');
  if (steps.length && summary && copyBtn) {
    var render = function () {
      var picked = steps.filter(function (s) { return s.getAttribute('aria-pressed') === 'true'; });
      if (!picked.length) {
        summary.innerHTML = 'Your day: <strong>nothing picked yet</strong> — tap a stop above.';
        copyBtn.disabled = true;
      } else {
        var names = picked.map(function (s) { return s.getAttribute('data-step'); });
        summary.innerHTML = 'Your day: <strong>' + names.map(escapeHtml).join(' → ') + '</strong>';
        copyBtn.disabled = false;
      }
    };
    steps.forEach(function (step) {
      step.addEventListener('click', function () {
        var on = step.getAttribute('aria-pressed') === 'true';
        step.setAttribute('aria-pressed', String(!on));
        var label = step.querySelector('.check-label');
        if (label) label.textContent = !on ? 'Added ✓' : 'Add to my day';
        render();
      });
    });
    copyBtn.addEventListener('click', function () {
      var picked = steps
        .filter(function (s) { return s.getAttribute('aria-pressed') === 'true'; })
        .map(function (s, i) { return (i + 1) + '. ' + s.getAttribute('data-step'); });
      var text = 'My Easternmost Day Trip (Downeast Dog House, Lubec ME):\n' + picked.join('\n');
      var done = function () {
        copyBtn.textContent = 'Copied ✓';
        setTimeout(function () { copyBtn.textContent = 'Copy my plan'; }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
      } else {
        fallbackCopy(text, done);
      }
    });
    render();
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* clipboard unavailable */ }
    document.body.removeChild(ta);
    done();
  }

  /* ---- Contact form: validate honestly, never pretend to send ---- */
  var form = document.getElementById('contact-form');
  if (form) {
    var notice = document.getElementById('form-notice');
    var setInvalid = function (name, invalid) {
      var field = form.querySelector('[data-field="' + name + '"]');
      if (field) field.classList.toggle('invalid', invalid);
      return !invalid;
    };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.elements.name.value.trim();
      var email = form.elements.email.value.trim();
      var msg = form.elements.message.value.trim();
      var consent = form.elements.consent.checked;
      var ok = true;
      ok = setInvalid('name', name.length < 2) && ok;
      ok = setInvalid('email', !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) && ok;
      ok = setInvalid('message', msg.length < 10) && ok;
      if (!consent) {
        ok = false;
        form.querySelector('.consent').style.borderColor = '#A52D23';
      } else {
        form.querySelector('.consent').style.borderColor = '';
      }
      if (!ok) {
        var firstBad = form.querySelector('.field.invalid input, .field.invalid textarea');
        if (firstBad) firstBad.focus();
        return;
      }
      // Concept demo: nothing is sent. Say so plainly.
      if (notice) {
        notice.classList.add('show');
        notice.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      form.querySelector('button[type="submit"]').textContent = 'Noted (demo — not sent)';
    });
    // Clear invalid state as the user types
    form.addEventListener('input', function (e) {
      var field = e.target.closest('.field');
      if (field) field.classList.remove('invalid');
    });
  }
})();
