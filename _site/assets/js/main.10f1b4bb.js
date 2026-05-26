(function () {
  'use strict';

  function setupHeaderDrawer() {
    var toggle = document.querySelector('[data-nav-toggle]');
    var drawer = document.querySelector('[data-nav-drawer]');
    var desktopQuery = window.matchMedia('(min-width: 768px)');
    var isOpen = false;

    if (!toggle || !drawer) return;

    function setOpenState(nextOpen) {
      isOpen = nextOpen;
      drawer.classList.toggle('is-open', isOpen);
      drawer.setAttribute('aria-hidden', String(!isOpen));
      toggle.setAttribute('aria-expanded', String(isOpen));
      document.body.classList.toggle('nav-open', isOpen);
    }

    function openDrawer() {
      if (desktopQuery.matches) return;
      setOpenState(true);
    }

    function closeDrawer() {
      if (!isOpen) return;
      setOpenState(false);
    }

    function toggleDrawer() {
      if (isOpen) {
        closeDrawer();
      } else {
        openDrawer();
      }
    }

    toggle.addEventListener('click', function (event) {
      event.preventDefault();
      toggleDrawer();
    });

    drawer.querySelectorAll('a[href]').forEach(function (link) {
      link.addEventListener('click', closeDrawer);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeDrawer();
    });

    document.addEventListener('click', function (event) {
      if (!isOpen) return;
      if (drawer.contains(event.target) || toggle.contains(event.target)) return;
      closeDrawer();
    });

    window.addEventListener('resize', function () {
      if (desktopQuery.matches) closeDrawer();
    });
  }

  // ─── Lazy Loading (native) ───
  if ('loading' in HTMLImageElement.prototype) {
    document.querySelectorAll('img[loading="lazy"]').forEach(function (img) {
      if (img.dataset.src) img.src = img.dataset.src;
    });
  }

  setupHeaderDrawer();

  // ─── Lightweight scroll reveal fallback (no external animation engine required) ───
  if (typeof AOS === 'undefined') {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    document
      .querySelectorAll(
        '.animate-on-scroll, .scroll-fade-in, .scroll-scale-in, .scroll-slide-left, .scroll-slide-right, [data-animate]'
      )
      .forEach(function (el) {
        observer.observe(el);
      });
  }

  // Header scroll enhancements may be handled by optional navigation modules.
})();
