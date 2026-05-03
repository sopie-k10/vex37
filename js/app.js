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
})();
