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
