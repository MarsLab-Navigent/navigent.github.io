const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canObserve = 'IntersectionObserver' in window;

// Nav turns frosted once the page scrolls; a hairline at the top shows reading progress.
const nav = $('nav.top');
const progress = $('.progress');
const onScroll = () => {
  nav?.classList.toggle('on', scrollY > 8);
  const max = document.documentElement.scrollHeight - innerHeight;
  if (progress) progress.style.width = `${max > 0 ? Math.min(100, (scrollY / max) * 100) : 0}%`;
};
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);
onScroll();

// Highlight the nav link of the section crossing the middle of the viewport.
const navLinks = $$('nav.top .links a');
const spied = navLinks.map((link) => $(link.getAttribute('href'))).filter(Boolean);
if (canObserve && spied.length) {
  const visible = new Set();
  const spy = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    }
    const current = spied.filter((section) => visible.has(section)).pop();
    navLinks.forEach((link) => link.classList.toggle('on', Boolean(current) && link.getAttribute('href') === `#${current.id}`));
  }, { rootMargin: '-45% 0px -50% 0px' });
  spied.forEach((section) => spy.observe(section));
}

// Clip wall: clips load only when the wall is on screen, and stay as posters for
// visitors who asked for less motion or less data.
const wall = $('.wall');
const tiles = $$('.wall video');
const saveData = Boolean(navigator.connection && navigator.connection.saveData);
if (wall && tiles.length && canObserve && !reducedMotion && !saveData) {
  new IntersectionObserver(([entry]) => {
    for (const video of tiles) {
      if (!entry.isIntersecting) { video.pause(); continue; }
      if (video.offsetParent === null) continue; // tile hidden at this width
      if (!video.getAttribute('src')) video.src = video.dataset.src;
      video.play().catch(() => {});
    }
  }, { threshold: 0.02 }).observe(wall);
}

// Video clips: starting one pauses the others.
const clips = $$('.rt video, .teaser video');
for (const clip of clips) {
  clip.addEventListener('play', () => {
    clips.forEach((other) => { if (other !== clip && !other.paused) other.pause(); });
  });
}

// Reveal on scroll. The classes are added here, so the page is complete without the script.
if (canObserve && !reducedMotion) {
  const targets = $$('h2.sec, .wrap > .lede, .prose, .plate, .tcard, .numbers, .block > h3, .block > .lede, .robot, .rt, .mstep, .step-txt, pre.bib');
  const reveal = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('in');
      reveal.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });
  for (const target of targets) {
    if (target.matches('.rt')) target.style.setProperty('--d', `${[...target.parentElement.children].indexOf(target) * 70}ms`);
    target.classList.add('rv');
    reveal.observe(target);
  }
}

// Headline numbers count up the first time they come into view.
if (canObserve && !reducedMotion) {
  for (const number of $$('.num .n[data-count]')) {
    const target = parseFloat(number.dataset.count);
    const decimals = (number.dataset.count.split('.')[1] || '').length;
    const counter = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      counter.disconnect();
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / 900);
        number.textContent = (target * (1 - (1 - t) ** 3)).toFixed(decimals);
        if (t < 1) requestAnimationFrame(tick);
        else number.textContent = number.dataset.count;
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    counter.observe(number);
  }
}

// Click a figure to see it full size.
const lightbox = document.createElement('div');
lightbox.className = 'lb';
lightbox.hidden = true;
lightbox.append(new Image());
document.body.append(lightbox);
const closeLightbox = () => { lightbox.hidden = true; };
for (const image of $$('.plate img')) {
  image.addEventListener('click', () => {
    lightbox.firstChild.src = image.currentSrc || image.src;
    lightbox.firstChild.alt = image.alt;
    lightbox.hidden = false;
  });
}
lightbox.addEventListener('click', closeLightbox);
addEventListener('keydown', (event) => { if (event.key === 'Escape') closeLightbox(); });

// Copy BibTeX.
const copyButton = $('.copy-button');
const bibtex = $('#bibtex');
copyButton?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(bibtex.textContent);
    copyButton.textContent = 'Copied';
  } catch {
    const range = document.createRange();
    range.selectNodeContents(bibtex);
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    copyButton.textContent = 'Selected';
  }
  setTimeout(() => { copyButton.textContent = 'Copy'; }, 1800);
});
