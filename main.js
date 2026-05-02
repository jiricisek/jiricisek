document.addEventListener('DOMContentLoaded', function(){
  const navLinks = document.querySelectorAll('.nav-list a[href^="#"]');
  const sections = Array.from(navLinks).map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const header = document.querySelector('.top-nav');

  function setNavHeightVar(){
    if(header) document.documentElement.style.setProperty('--nav-height', header.offsetHeight + 'px');
  }
  setNavHeightVar();
  window.addEventListener('resize', setNavHeightVar);

  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry => {
      const id = entry.target.id;
      const link = document.querySelector(`.nav-list a[href="#${id}"]`);
      if(entry.isIntersecting){
        navLinks.forEach(l => l.classList.remove('active'));
        if(link) link.classList.add('active');
      }
    });
  },{root:null,rootMargin:'0px 0px -40% 0px',threshold:0});

  sections.forEach(s => io.observe(s));

  // Smooth scroll offset handling
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if(!href || !href.startsWith('#')) return;
      const target = document.querySelector(href);
      if(!target) return;
      e.preventDefault();
      const navH = header ? header.offsetHeight : 72;
      const top = target.getBoundingClientRect().top + window.pageYOffset - navH - 10;
      window.scrollTo({top,behavior:'smooth'});
    });
  });

  // Collapsible panels helper (smooth open/close)
  function setupCollapsible(button, container, openLabel, closeLabel) {
    const openClass = 'open';

    // initialize aria and starting height
    if (!container.classList.contains(openClass)) {
      container.setAttribute('aria-hidden', 'true');
      container.style.maxHeight = '0px';
    } else {
      container.setAttribute('aria-hidden', 'false');
    }

    // persistent transitionend handler to finalize open/close states
    // use a flag to avoid re-entrant toggles while animating
    container._isCollapsing = false;
    container.addEventListener('transitionend', (e) => {
      if (e.target !== container || e.propertyName !== 'max-height') return;
      container._isCollapsing = false;
      if (container.classList.contains(openClass)) {
        // finished opening: remove explicit max-height so content can size naturally
        container.style.maxHeight = '';
        // after open transition completes, ensure element is visible in viewport
        try {
          setTimeout(() => container.scrollIntoView({ behavior: 'smooth', block: 'center' }), 20);
        } catch (err) {
          // ignore environments where scrollIntoView may not be available
        }
      } else {
        // finished closing: ensure aria is hidden
        container.setAttribute('aria-hidden', 'true');
      }
    });

    button.addEventListener('click', () => {
      // prevent toggling while a previous transition is running
      if (container._isCollapsing) return;
      container._isCollapsing = true;

      const isOpen = container.classList.contains(openClass);
      if (!isOpen) {
        // OPEN: set explicit height then enable open class for opacity transition
        container.style.maxHeight = container.scrollHeight + 'px';
        requestAnimationFrame(() => container.classList.add(openClass));
        container.setAttribute('aria-hidden', 'false');
        button.setAttribute('aria-expanded', 'true');
        button.textContent = closeLabel;
      } else {
        // CLOSE: set current height then collapse to 0 to animate
        container.style.maxHeight = container.scrollHeight + 'px';
        container.offsetHeight; // force reflow
        container.style.maxHeight = '0px';
        container.classList.remove(openClass);
        button.setAttribute('aria-expanded', 'false');
        button.textContent = openLabel;
      }
    });
    
  }

  // wire up accommodation and payment toggles
  const toggleBtn = document.getElementById('toggle-accom-image');
  const accomContainer = document.getElementById('accom-image-container');
  if (toggleBtn && accomContainer) {
    setupCollapsible(toggleBtn, accomContainer, 'Zobrazit blízká ubytování', 'Skrýt blízká ubytování');
  }

  const paymentBtn = document.getElementById('show-payment');
  const paymentInfo = document.getElementById('payment-info');
  if (paymentBtn && paymentInfo) {
    setupCollapsible(paymentBtn, paymentInfo, 'Zobrazit platební informace', 'Skrýt platební informace');
  }

  // Mobile nav toggle for small screens
  const mobileToggle = document.getElementById('mobile-nav-toggle');
  const navMenu = document.getElementById('nav-menu');
  const navList = navMenu ? navMenu.querySelector('.nav-list') : null;
  if (mobileToggle && navList) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = navList.classList.contains('open');
      if (!isOpen) {
        navList.classList.add('open');
        mobileToggle.setAttribute('aria-expanded', 'true');
        navMenu.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      } else {
        navList.classList.remove('open');
        mobileToggle.setAttribute('aria-expanded', 'false');
        navMenu.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }
    });

    // Close mobile menu when a nav link is clicked
    navList.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', () => {
      navList.classList.remove('open');
      mobileToggle.setAttribute('aria-expanded', 'false');
      navMenu.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }));

    // Ensure menu closes when resizing to desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth > 700 && navList.classList.contains('open')) {
        navList.classList.remove('open');
        mobileToggle.setAttribute('aria-expanded', 'false');
        navMenu.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }
    });
  }

  // Copy-to-clipboard for IBAN
  const copyBtn = document.getElementById('copy-iban');
  const ibanText = document.getElementById('iban-text');
  if (copyBtn && ibanText) {
    copyBtn.addEventListener('click', async () => {
      const raw = ibanText.textContent.trim();
      // extract account like "5492173073/0800" (digits, optional spaces, slash)
      const m = raw.match(/(\d+[\s\u00A0]*\/[\s\u00A0]*\d+)/);
      const toCopy = m ? m[1].replace(/\s+/g, '') : raw;
      const prev = copyBtn.textContent;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(toCopy);
        } else {
          const ta = document.createElement('textarea');
          ta.value = toCopy;
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        copyBtn.textContent = 'Zkopírováno';
        copyBtn.disabled = true;
        setTimeout(() => { copyBtn.textContent = prev; copyBtn.disabled = false; }, 2000);
      } catch (err) {
        // ignore
      }
    });
  }

  // Accommodation image: show fallback message and hide download if image doesn't load
  const accomImg = document.getElementById('accom-image');
  const downloadBtn = document.querySelector('.download-btn');
  if (accomImg) {
    accomImg.addEventListener('error', () => {
      accomImg.style.display = 'none';
      if (downloadBtn) downloadBtn.style.display = 'none';
      const parent = accomImg.closest('.accom-image-inner') || accomImg.parentNode;
      if (parent && !parent.querySelector('.accom-fallback')) {
        const p = document.createElement('p');
        p.className = 'accom-fallback muted';
        p.textContent = 'Mapa ubytování není k dispozici. Prosím zkontrolujte repozitář nebo kontaktujte organizátory.';
        parent.appendChild(p);
      }
    });
  }

});
