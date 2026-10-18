/* Team 37X, v3 page interactions (2026-10-18).
   No framework. Defer-loaded. Adds to the original behaviour: the hero
   viewport (callout leaders, render hand-off, x-ray lens with crosshair),
   the budget dimension chain and the "Most popular" stamp. Motion is
   skipped under prefers-reduced-motion; the form, topic buttons and
   event modals are unchanged from the live page. ------------------- */

(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Nav border once the page scrolls
  const nav = document.getElementById('nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ── Hero viewport ───────────────────────────────────────────────────
  const vp = document.getElementById('vp');
  const art = vp && vp.parentElement;
  if (vp && art) {
    const leaders = vp.querySelector('.vp__leaders');
    const paths = leaders ? leaders.querySelectorAll('path') : [];
    const dots = leaders ? leaders.querySelectorAll('circle') : [];
    const chips = art.querySelectorAll('.hero__chip');
    // anchor points on the drawing, in its 640 x 560 viewBox units
    const anchors = [[262, 280], [560, 118], [236, 470]];

    // Leader lines run from the nearest edge of each callout to its anchor.
    const layout = () => {
      const r = vp.getBoundingClientRect();
      if (!r.width || !leaders) return;
      vp.style.setProperty('--vp-h', r.height + 'px');
      leaders.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
      const k = r.width / 640;
      chips.forEach((chip, i) => {
        if (!paths[i] || !anchors[i]) return;
        const c = chip.getBoundingClientRect();
        const ax = anchors[i][0] * k, ay = anchors[i][1] * k;
        const cx = c.left - r.left, cy = c.top - r.top, cw = c.width, ch = c.height;
        // pick the start point on the chip's box closest to the anchor
        const sx = Math.max(cx, Math.min(ax, cx + cw));
        const sy = Math.max(cy, Math.min(ay, cy + ch));
        paths[i].setAttribute('d', `M${sx.toFixed(1)} ${sy.toFixed(1)}L${ax.toFixed(1)} ${ay.toFixed(1)}`);
        dots[i].setAttribute('cx', ax.toFixed(1));
        dots[i].setAttribute('cy', ay.toFixed(1));
        dots[i].setAttribute('r', 4);
      });
    };
    layout();
    window.addEventListener('resize', layout, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);

    // When the render pass has finished, the line art steps back and the
    // x-ray lens becomes available.
    const ready = () => vp.classList.add('is-ready');
    const render = vp.querySelector('.vp__render');
    if (reduce || !render || getComputedStyle(render).animationName === 'none') ready();
    else {
      render.addEventListener('animationend', ready, { once: true });
      setTimeout(ready, 4600); // in case animationend never fires (background tab)
    }

    // X-ray lens: on a mouse, hovering the drawing cuts a hole in the photo
    // that shows the line art underneath. Fine pointers only.
    const lens = vp.querySelector('.vp__lens');
    const svg = vp.querySelector('.cad');
    if (lens && svg && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      const copy = svg.cloneNode(true);
      copy.querySelectorAll('.part').forEach((g) => g.removeAttribute('style'));
      copy.classList.add('cad--lens');
      lens.appendChild(copy);
      let raf = 0, mx = 0, my = 0;
      const paint = () => {
        raf = 0;
        vp.style.setProperty('--mx', mx + 'px');
        vp.style.setProperty('--my', my + 'px');
      };
      vp.addEventListener('pointermove', (e) => {
        if (!vp.classList.contains('is-ready') || e.pointerType !== 'mouse') return;
        const r = vp.getBoundingClientRect();
        mx = e.clientX - r.left; my = e.clientY - r.top;
        if (!raf) raf = requestAnimationFrame(paint);
        vp.classList.add('is-lens');
      });
      vp.addEventListener('pointerleave', () => vp.classList.remove('is-lens'));
    }
  }

  // ── Budget: one bar, each segment sized by its share of the total ───
  // Decorative (aria-hidden); the amounts in the list are unchanged.
  const callout = document.querySelector('.callout');
  if (callout) {
    const rows = Array.from(callout.querySelectorAll('li:not(.callout__total)'));
    const val = (li) => parseFloat((li.querySelector('b') || {}).textContent.replace(/[^0-9.]/g, '')) || 0;
    const total = rows.reduce((s, li) => s + val(li), 0);
    if (total > 0) {
      const chain = document.createElement('div');
      chain.className = 'chain';
      chain.setAttribute('aria-hidden', 'true');
      const bar = document.createElement('div');
      bar.className = 'chain__bar';
      rows.forEach((li, i) => {
        const seg = document.createElement('span');
        seg.className = 'chain__seg';
        seg.style.setProperty('--w', (val(li) / total * 100).toFixed(2));
        seg.style.setProperty('--i', i);
        seg.style.setProperty('--hx', getComputedStyle(li).getPropertyValue('--hx'));
        bar.appendChild(seg);
      });
      const dim = document.createElement('div');
      dim.className = 'chain__dim';
      chain.append(bar, dim);
      callout.querySelector('h3').after(chain);
      onView(chain, () => chain.classList.add('is-on'), .4);
    }
  }

  // ── The "Most popular" stamp lands when the tiers come into view ────
  const flag = document.querySelector('.tier__flag');
  // watch the card, not the stamp: the stamp starts scaled up, partly off-screen
  if (flag) onView(flag.closest('.tier') || flag, () => flag.classList.add('is-on'), .4);

  function onView(el, fn, threshold) {
    if (reduce || !('IntersectionObserver' in window)) { fn(); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { fn(); io.disconnect(); } });
    }, { threshold });
    io.observe(el);
  }

  // ── Achievement modals ──────────────────────────────────────────────
  // Each clickable card has data-modal="<key>" pointing at a hidden
  // <template id="modal-<key>">. Its content is cloned into the shared
  // <dialog>, opened with showModal() for native focus trap + Esc.
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
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });
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
