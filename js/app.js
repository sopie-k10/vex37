/* Team 37X — minimal page interactions
   No framework. Defer-loaded. ----------------------------------------- */

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

  // IntersectionObserver: fade-in sections as they enter the viewport.
  // Skip if reduced motion preference is set.
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce && 'IntersectionObserver' in window) {
    const targets = document.querySelectorAll(
      '.story, .ach, .team, .tiers, .sponsors-current, .contact'
    );
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in-view');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    targets.forEach((t) => io.observe(t));
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
