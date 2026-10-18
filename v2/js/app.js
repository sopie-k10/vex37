/* Team 37X — page interactions
   No framework. Defer-loaded. Redesign 2026-10-18 adds the hero thermal
   field, the scroll gauge, count-ups and heat gauges; all skip under
   prefers-reduced-motion. ----------------------------------------- */

(() => {
  // Subtle nav background shift on scroll
  const nav = document.getElementById('nav');
  if (nav) {
    const onScroll = () => {
      if (window.scrollY > 8) nav.classList.add('is-scrolled');
      else nav.classList.remove('is-scrolled');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Scroll gauge: heat bar along the bottom of the nav ──────────────
  const gauge = document.querySelector('.nav__heat');
  if (gauge && !reduce) {
    let queued = false;
    const paint = () => {
      queued = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      gauge.style.setProperty('--p', max > 0 ? Math.min(1, window.scrollY / max).toFixed(4) : 0);
    };
    window.addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(paint); } }, { passive: true });
    paint();
  }

  // ── Budget gauges: each line's share of the total, as a bar ─────────
  // Decorative (aria-hidden); the amounts themselves are unchanged.
  const callout = document.querySelector('.callout');
  if (callout) {
    const num = (el) => parseFloat((el.textContent || '').replace(/[^0-9.]/g, '')) || 0;
    const total = callout.querySelector('.callout__total b');
    const sum = total ? num(total) : 0;
    if (sum > 0) {
      callout.querySelectorAll('li:not(.callout__total)').forEach((li) => {
        const b = li.querySelector('b');
        if (!b) return;
        const bar = document.createElement('i');
        bar.className = 'callout__bar';
        bar.setAttribute('aria-hidden', 'true');
        bar.style.setProperty('--share', (num(b) / sum).toFixed(4));
        li.appendChild(bar);
      });
    }
  }

  // ── "Heat up" when in view: stat bars + count-up, tier gauges, budget ─
  const countUp = (el) => {
    const end = parseInt(el.textContent, 10);
    if (!(end > 0)) return;
    const t0 = performance.now(), dur = 1100;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      el.textContent = String(Math.round(end * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(step); else el.textContent = String(end);
    };
    requestAnimationFrame(step);
  };
  const heatTargets = document.querySelectorAll('.stats, .tiers, .callout');
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-hot');
        if (e.target.classList.contains('stats')) e.target.querySelectorAll('.stat b').forEach(countUp);
        io.unobserve(e.target);
      });
    }, { threshold: 0.25 });
    heatTargets.forEach((t) => io.observe(t));
  } else {
    heatTargets.forEach((t) => t.classList.add('is-hot'));
  }

  // ── Achievement cards heat up under the pointer ─────────────────────
  if (!reduce && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.ach__card:not(.ach__card--feat)').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
      card.addEventListener('pointerleave', () => {
        card.style.removeProperty('--mx');
        card.style.removeProperty('--my');
      });
    });
  }

  // ── Hero thermal field ──────────────────────────────────────────────
  // A low-resolution heat map (about 1 cell per 3 CSS px) drawn on a canvas
  // and scaled up by the browser. A few drifting heat sources sit behind the
  // robot; the pointer (or a finger) adds one more. Values are banded into
  // isotherms and coloured on a thermal-camera scale. It pauses off-screen
  // and in background tabs; under reduced motion it draws one still frame.
  const cvs = document.querySelector('.hero__heat');
  const hero = document.querySelector('.hero');
  const ctx = cvs && cvs.getContext ? cvs.getContext('2d', { alpha: false }) : null;
  if (ctx && hero) {
    const stops = [
      [0.00, [10, 6, 18]], [0.16, [24, 9, 42]], [0.32, [74, 13, 94]], [0.48, [150, 20, 66]],
      [0.62, [224, 38, 43]], [0.76, [255, 106, 19]], [0.89, [255, 194, 26]], [1.00, [255, 244, 220]],
    ];
    const BANDS = 15;
    const pal = new Uint8ClampedArray(256 * 3);
    for (let i = 0; i < 256; i++) {
      const v = Math.round((i / 255) * BANDS) / BANDS; // isotherm banding
      let j = 0;
      while (j < stops.length - 2 && v > stops[j + 1][0]) j++;
      const [a, ca] = stops[j], [b, cb] = stops[j + 1];
      const k = Math.min(1, Math.max(0, (v - a) / (b - a)));
      for (let c = 0; c < 3; c++) pal[i * 3 + c] = ca[c] + (cb[c] - ca[c]) * k;
    }

    let W = 0, H = 0, img = null, aspect = 1;
    const size = () => {
      const r = cvs.getBoundingClientRect();
      aspect = r.width / Math.max(1, r.height);
      // Darren, 2026-10-18 13:34: "the v2 fire is blurry". Was 1 cell per 9 CSS px (cap 170),
      // which the browser smeared when scaling up. Now 1 cell per 3 px (cap 560): sharp isotherm
      // edges, still ~1.2 M cheap ops a frame at 30 fps on a wide screen.
      W = Math.max(96, Math.min(560, Math.round(r.width / 3)));
      H = Math.max(36, Math.round(W / aspect));
      cvs.width = W; cvs.height = H;
      img = ctx.createImageData(W, H);
    };

    const wide = () => window.innerWidth > 860;
    // Sources in normalised coordinates: cx, cy, orbit rx, ry, speed, phase, radius, strength.
    const src = [
      [0.74, 0.48, 0.05, 0.06, 0.21, 0.0, 0.20, 1.00],
      [0.80, 0.30, 0.08, 0.05, 0.33, 1.7, 0.12, 0.70],
      [0.66, 0.70, 0.07, 0.06, 0.27, 3.1, 0.14, 0.70],
      [0.90, 0.62, 0.05, 0.10, 0.18, 4.2, 0.13, 0.60],
      [0.55, 0.20, 0.10, 0.06, 0.15, 2.4, 0.10, 0.42],
      [0.30, 0.85, 0.15, 0.05, 0.12, 5.3, 0.13, 0.40],
    ];
    const ptr = { x: -9, y: -9, s: 0, target: 0 };

    const draw = (t) => {
      const d = img.data, sec = t / 1000, mob = !wide(), gain = mob ? 1.1 : 0.7;
      const S = src.map(([cx, cy, rx, ry, sp, ph, rad, st]) => {
        // On phones the robot sits under the copy, so heat gathers lower and centred.
        const x = (mob ? 0.5 + (cx - 0.74) * 1.8 : cx) + Math.cos(sec * sp + ph) * rx;
        const y = (mob ? 0.77 + (cy - 0.48) * 0.4 : cy) + Math.sin(sec * sp * 1.3 + ph) * ry;
        const pulse = 0.85 + 0.15 * Math.sin(sec * (sp * 3) + ph * 2);
        return [x * W, y * H, (rad * W) * (rad * W), st * pulse];
      });
      if (ptr.s > 0.01) S.push([ptr.x * W, ptr.y * H, (0.11 * W) ** 2, 0.95 * ptr.s]);
      let o = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          let v = 0;
          for (let i = 0; i < S.length; i++) {
            const dx = x - S[i][0], dy = (y - S[i][1]) * 1.15, r2 = S[i][2];
            v += S[i][3] * r2 / (dx * dx + dy * dy + r2);
          }
          v = v * gain - 0.1;
          const idx = v <= 0 ? 0 : v >= 1 ? 255 : (v * 255) | 0;
          d[o] = pal[idx * 3]; d[o + 1] = pal[idx * 3 + 1]; d[o + 2] = pal[idx * 3 + 2]; d[o + 3] = 255;
          o += 4;
        }
      }
      ctx.putImageData(img, 0, 0);
    };

    size();
    if (reduce) {
      draw(4000);
      window.addEventListener('resize', () => { size(); draw(4000); });
    } else {
      let running = false, visible = true, raf = 0, last = 0;
      const loop = (t) => {
        raf = requestAnimationFrame(loop);
        if (t - last < 33) return; // ~30 fps is plenty for a heat field
        last = t;
        ptr.s += (ptr.target - ptr.s) * 0.12;
        draw(t);
      };
      const sync = () => {
        const want = visible && !document.hidden;
        if (want && !running) { running = true; raf = requestAnimationFrame(loop); }
        else if (!want && running) { running = false; cancelAnimationFrame(raf); }
      };
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }).observe(hero);
      }
      document.addEventListener('visibilitychange', sync);
      let rt = 0;
      window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(size, 150); });
      const move = (e) => {
        const r = cvs.getBoundingClientRect();
        ptr.x = (e.clientX - r.left) / r.width;
        ptr.y = (e.clientY - r.top) / r.height;
        ptr.target = 1;
      };
      hero.addEventListener('pointermove', move, { passive: true });
      hero.addEventListener('pointerdown', move, { passive: true });
      hero.addEventListener('pointerleave', () => { ptr.target = 0; });
      hero.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') ptr.target = 0; });
      draw(0);
      sync();
    }
  }

  // ── Achievement modals ──────────────────────────────────────────────
  // Each clickable card has data-modal="<key>" pointing at a hidden
  // <template id="modal-<key>"> in the page. We clone the template content
  // into the shared <dialog> and call showModal() so we get native focus
  // trapping + Esc-to-close behavior.
  const modal = document.getElementById('event-modal');
  if (modal && typeof modal.showModal === 'function') {
    const body = modal.querySelector('.modal__body');
    const closeBtn = modal.querySelector('.modal__close');

    const openModal = (key) => {
      const tpl = document.getElementById('modal-' + key);
      if (!tpl || !body) return;
      body.replaceChildren(tpl.content.cloneNode(true));
      modal.showModal();
    };

    document.querySelectorAll('[data-modal]').forEach((card) => {
      card.addEventListener('click', () => openModal(card.dataset.modal));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(card.dataset.modal);
        }
      });
    });

    if (closeBtn) closeBtn.addEventListener('click', () => modal.close());
    // Backdrop click closes (when click target is the dialog itself, not its
    // content — clicks on inner elements bubble up but with .modal__body as
    // their target, not the dialog).
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.close();
    });
  }
})();

/* Contact form (2026-10-09): posts to the team's endpoint; tier buttons prefill the message. */
(function () {
  var f = document.getElementById('team-form');
  if (!f) return;
  var t = f.querySelector('input[name="t"]'), st = f.querySelector('.cf-status'), btn = f.querySelector('.cf-send');
  var msg = f.querySelector('textarea[name="message"]');
  t.value = String(Date.now());
  document.querySelectorAll('[data-topic]').forEach(function (a) {
    a.addEventListener('click', function () {
      var topic = a.getAttribute('data-topic');
      if (!msg.value.trim()) msg.value = topic === 'Sponsorship'
        ? "Hi Team 37X, we're interested in sponsoring the team. "
        : "Hi Team 37X, we're interested in the " + topic.replace(/ Tier$/, '') + ' tier. ';
      setTimeout(function () { f.querySelector('input[name="name"]').focus({ preventScroll: true }); }, 500);
    });
  });
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    st.className = 'cf-status'; st.textContent = 'Sending…'; btn.disabled = true;
    fetch(f.action, { method: 'POST', body: new FormData(f) })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .then(function (j) {
        if (j && j.ok) { f.reset(); t.value = String(Date.now()); st.className = 'cf-status ok';
                         st.textContent = 'Thank you. Your message is on its way to the team.'; }
        else { st.className = 'cf-status err'; st.textContent = (j && j.error) || 'Something went wrong. Please try again.'; }
      })
      .catch(function () { st.className = 'cf-status err'; st.textContent = 'No connection. Please try again.'; })
      .then(function () { btn.disabled = false; });
  });
})();
