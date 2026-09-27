/*
 Physics II Interactive Course
 Lead creator & developer: Asadbek Jumaboyev Shokirjon o'g'li
 Academic co-author / scientific reviewer:
 Prof. Xolboyev Yunusali Xasan o'g'li
 Published under Turin Prepnik
 Pilot Beta v0.9
*/

window.MathJax = window.MathJax || {};
window.MathJax.tex = window.MathJax.tex || {};
window.MathJax.tex.inlineMath = window.MathJax.tex.inlineMath || [['\\(', '\\)']];
window.MathJax.tex.macros = Object.assign({
  vec: "\\mathbf",
  grad: "\\nabla",
  div: "\\nabla \\cdot",
  curl: "\\nabla \\times",
  dtau: "d\\tau",
  dl: "d\\vec{l}",
  da: "d\\vec{a}",
  rsep: "{\\mathscr{r}}",
  vecrsep: "{\\vec{\\mathscr{r}}}",
  hatrsep: "{\\hat{\\mathscr{r}}}"
}, window.MathJax.tex.macros || {});

(function loadMathJaxIfNeeded() {
  function needsMathJax() {
    if (document.querySelector('script[src*="mathjax"]')) return false;
    if (window.MathJax && window.MathJax.startup && window.MathJax.startup.promise) return false;
    return /(\$\$|\\\(|\\\[)/.test(document.body ? document.body.textContent : '');
  }

  function load() {
    if (!needsMathJax()) return;
    var script = document.createElement('script');
    script.id = 'MathJax-script';
    script.src = 'vendor/mathjax/tex-mml-chtml.js';
    script.async = true;
    document.head.appendChild(script);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
  else load();
})();

(function courseNavigation() {
  var COURSE = window.COURSE_MAP || { pages: {}, notation: [] };
  var pages = COURSE.pages || {};
  var currentFile = decodeURIComponent((location.pathname.split('/').pop() || 'index.html'));
  pages['about.html'] = pages['about.html'] || {
    type: 'page',
    title: 'About / Credits',
    url: 'about.html',
    searchable: true,
    h1: 'Physics II Interactive Course',
    searchText: 'About credits authorship Asadbek Jumaboyev Shokirjon ogli Prof Xolboyev Yunusali Xasan ogli Turin Prepnik pilot beta'
  };
  pages['pilot.html'] = pages['pilot.html'] || {
    type: 'page',
    title: 'About the Pilot',
    url: 'pilot.html',
    searchable: true,
    h1: 'About the Pilot',
    searchText: 'pilot university students voluntary feedback clarity usability simulations Turin Prepnik'
  };
  var currentPage = pages[currentFile] || null;
  var activeConcept = null;

  function loadSupportScript(src) {
    if (document.querySelector('script[src$="' + src + '"]')) return Promise.resolve();
    var script = document.createElement('script');
    script.src = src;
    return new Promise(function (resolve) {
      script.onload = resolve;
      script.onerror = resolve;
      document.head.appendChild(script);
    });
  }

  var supportReady = Promise.all([loadSupportScript('project-info.js'), loadSupportScript('feedback-config.js'), loadSupportScript('feedback.js')]);

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function ensureGlobalStyles() {
    if (document.getElementById('course-global-style')) return;
    if (document.querySelector('link[href$="style.css"]')) return;
    var link = document.createElement('link');
    link.id = 'course-global-style';
    link.rel = 'stylesheet';
    link.href = 'style.css';
    document.head.appendChild(link);
  }

  function localHrefParts(href) {
    if (!href || /^(https?:|mailto:|tel:|#|javascript:)/i.test(href)) return null;
    var match = href.match(/^([^?#]+\.html)(\?[^#]*)?(#.*)?$/i);
    if (!match) return null;
    return { file: match[1], query: match[2] || '', hash: match[3] || '' };
  }

  function cleanDeepDiveTitle(title) {
    return String(title || '')
      .replace(/^\s*(Deep Dive|Deeper Dive|Details?|Derivation|Example)\s*:\s*/i, '')
      .replace(/\s*[-–—]\s*Deep Dive\s*$/i, '')
      .replace(/\s+a\s+deep\s+dive\s*$/i, '')
      .trim();
  }

  function getPageTitle(page) {
    if (!page) return document.title || currentFile;
    return page.title || page.h1 || document.title || currentFile;
  }

  function projectInfo() {
    return window.PHYSICS_II_PROJECT_INFO || {
      project: 'Physics II Interactive Course',
      version: '0.9',
      stage: 'Pilot Beta',
      year: '2026',
      lead_creator: "Asadbek Jumaboyev Shokirjon o'g'li",
      academic_coauthor: "Prof. Xolboyev Yunusali Xasan o'g'li",
      publisher: 'Turin Prepnik',
      contact: 'asadbek31415@gmail.com'
    };
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[ch];
    });
  }

  function stripLeadingNumber(title) {
    return String(title || '').replace(/^\s*\d+\.?\s*/, '').trim();
  }

  function displayTitle(title) {
    var clean = cleanDeepDiveTitle(stripLeadingNumber(title));
    return clean || String(title || '').trim();
  }

  function cleanSearchText(text) {
    return String(text || '')
      .replace(/Home\s*>\s*[^A-Z\n\r]+/g, ' ')
      .replace(/\b(?:Home|Electrostatics|Magnetostatics|Electric Fields in Matter|Magnetic Fields in Matter|Electrodynamics|Electromagnetic Waves)\s*>\s*[^.!?]{0,170}/g, ' ')
      .replace(/\bDeep Dive:\s*/gi, ' ')
      .replace(/\$\$[\s\S]*?\$\$/g, ' ')
      .replace(/\\\[[\s\S]*?\\\]/g, ' ')
      .replace(/\\\([\s\S]*?\\\)/g, ' ')
      .replace(/\\[a-zA-Z]+\*?(?:\{[^{}]*\})?/g, ' ')
      .replace(/[${}_^]/g, ' ')
      .replace(/(^|\s)\d+\.\s+/g, '$1')
      .replace(/\s+([,.;:])/g, '$1')
      .replace(/:\s*\./g, '.')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function foldText(text) {
    return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function wordsFrom(text) {
    return foldText(cleanSearchText(text)).match(/[a-z0-9]{2,}/g) || [];
  }

  function editDistance(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 3;
    var prev = [];
    var curr = [];
    for (var j = 0; j <= b.length; j++) prev[j] = j;
    for (var i = 1; i <= a.length; i++) {
      curr[0] = i;
      for (j = 1; j <= b.length; j++) {
        var cost = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      }
      prev = curr.slice();
    }
    return prev[b.length];
  }

  function termMatches(term, word) {
    if (!term || !word) return false;
    if (word.indexOf(term) >= 0 || term.indexOf(word) >= 0) return true;
    if (term.length < 4 || word.length < 4) return false;
    var limit = term.length >= 7 ? 2 : 1;
    return editDistance(term, word) <= limit;
  }

  function bestFindTerm(item, terms) {
    var visible = cleanSearchText([item.title, item.snippet].join(' '));
    var rawWords = visible.match(/[A-Za-zÀ-ž0-9][A-Za-zÀ-ž0-9'’-]*/g) || [];
    for (var t = 0; t < terms.length; t++) {
      var term = terms[t];
      for (var i = 0; i < rawWords.length; i++) {
        if (termMatches(term, foldText(rawWords[i]))) return rawWords[i].replace(/[’']s$/i, '');
      }
    }
    return terms[0] || '';
  }

  function excerpt(text, terms) {
    var clean = cleanSearchText(text);
    if (!clean) return '';
    var lower = foldText(clean);
    var first = -1;
    (terms || []).some(function (term) {
      first = lower.indexOf(term);
      return first >= 0;
    });
    var start = first >= 0 ? Math.max(0, first - 70) : 0;
    var end = Math.min(clean.length, start + 230);
    var snippet = clean.slice(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < clean.length) snippet += '...';
    return snippet;
  }

  function highlightTerms(text, terms) {
    var raw = String(text || '');
    var folded = foldText(raw);
    var ranges = [];
    (terms || []).filter(Boolean).map(foldText).sort(function (a, b) { return b.length - a.length; }).forEach(function (term) {
      var start = 0;
      while (term && (start = folded.indexOf(term, start)) >= 0) {
        ranges.push([start, start + term.length]);
        start += term.length;
      }
    });
    if (!ranges.length) return escapeHtml(raw);
    ranges.sort(function (a, b) { return a[0] - b[0] || b[1] - a[1]; });
    var merged = [];
    ranges.forEach(function (range) {
      var last = merged[merged.length - 1];
      if (!last || range[0] > last[1]) merged.push(range.slice());
      else last[1] = Math.max(last[1], range[1]);
    });
    var html = '';
    var cursor = 0;
    merged.forEach(function (range) {
      html += escapeHtml(raw.slice(cursor, range[0]));
      html += '<mark>' + escapeHtml(raw.slice(range[0], range[1])) + '</mark>';
      cursor = range[1];
    });
    html += escapeHtml(raw.slice(cursor));
    return html;
  }

  function hrefWithFind(url, query) {
    var parts = localHrefParts(url);
    if (!parts) return url;
    var params = new URLSearchParams(parts.query ? parts.query.slice(1) : '');
    if (query) params.set('find', query);
    var queryText = params.toString();
    return parts.file + (queryText ? '?' + queryText : '') + parts.hash;
  }

  function ensureHeader() {
    var headerBar = document.querySelector('.header-bar');
    if (!headerBar) {
      headerBar = document.createElement('div');
      headerBar.className = 'header-bar';
      document.body.insertBefore(headerBar, document.body.firstChild);
    }

    if (headerBar.dataset.courseHeaderReady !== 'true') {
      headerBar.innerHTML = '';
      headerBar.dataset.courseHeaderReady = 'true';
    }

    var nav = headerBar.querySelector('.nav-container');
    if (!nav) {
      nav = document.createElement('div');
      nav.className = 'nav-container';
      headerBar.appendChild(nav);
    }

    var crumb = nav.querySelector('.breadcrumb');
    if (!crumb) {
      crumb = document.createElement('div');
      crumb.className = 'breadcrumb';
      nav.insertBefore(crumb, nav.firstChild);
    }
    return crumb;
  }

  function breadcrumbItem(label, href, className) {
    var attrs = className ? ' class="' + className + '"' : '';
    var cleanLabel = escapeHtml(label);
    if (href) return '<a' + attrs + ' href="' + href + '">' + cleanLabel + '</a>';
    return '<span' + attrs + '>' + cleanLabel + '</span>';
  }

  function findConceptById(id, page) {
    if (!id || !page || !page.concepts) return null;
    return page.concepts.find(function (concept) { return concept.id === id; }) || null;
  }

  function getBackTarget() {
    var params = new URLSearchParams(location.search);
    var back = params.get('back');
    if (back && /^[^?#]+\.html(#[A-Za-z0-9_-]+)?$/.test(back)) return back;
    if (currentPage && currentPage.lessonUrl) {
      return currentPage.lessonUrl + (currentPage.conceptId ? '#' + currentPage.conceptId : '');
    }
    return currentPage && currentPage.sectionUrl ? currentPage.sectionUrl : 'index.html';
  }

  function renderBreadcrumb(conceptOverride) {
    if (!currentPage) return;
    if (currentPage.type === 'home') {
      addSearchLink();
      return;
    }
    var crumb = ensureHeader();
    var parts = [breadcrumbItem('Home', currentFile === 'index.html' ? '' : 'index.html')];

    if (currentPage.type === 'section') {
      parts.push(breadcrumbItem(displayTitle(currentPage.title), currentFile));
    } else if (currentPage.section && currentPage.sectionUrl) {
      parts.push(breadcrumbItem(displayTitle(currentPage.section), currentPage.sectionUrl, 'breadcrumb-optional'));
    }

    if (currentPage.type === 'lesson') {
      parts.push(breadcrumbItem(displayTitle(currentPage.title), currentFile));
      var concept = conceptOverride || activeConcept;
      if (concept) parts.push(breadcrumbItem(displayTitle(concept.title), '', 'breadcrumb-current'));
    } else if (currentPage.type === 'deepDive') {
      if (currentPage.lesson && currentPage.lessonUrl) {
        parts.push(breadcrumbItem(displayTitle(currentPage.lesson), currentPage.lessonUrl));
      }
      if (currentPage.conceptTitle && currentPage.lessonUrl && currentPage.conceptId) {
        parts.push(breadcrumbItem(displayTitle(currentPage.conceptTitle), currentPage.lessonUrl + '#' + currentPage.conceptId, 'breadcrumb-current'));
      }
      parts.push(breadcrumbItem(currentPage.title, '', 'breadcrumb-current'));
    } else if (currentPage.type === 'page') {
      parts.push(breadcrumbItem(displayTitle(currentPage.title)));
    }

    crumb.onclick = function (event) {
      var link = event.target.closest('a');
      if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      var target = new URL(link.href, location.href);
      if (target.origin !== location.origin || target.pathname !== location.pathname || target.hash) return;
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    };
    crumb.innerHTML = parts.filter(Boolean).join(' <span class="breadcrumb-separator">&gt;</span> ');
    addSearchLink();
    requestAnimationFrame(function () {
      crumb.scrollLeft = crumb.scrollWidth;
      setTimeout(function () {
        crumb.scrollLeft = crumb.scrollWidth;
      }, 80);
      setTimeout(function () {
        crumb.scrollLeft = crumb.scrollWidth;
      }, 300);
      setTimeout(function () {
        crumb.scrollLeft = crumb.scrollWidth;
      }, 700);
    });
  }

  function addSearchLink() {
    var header = document.querySelector('.header-bar header, .header-bar .nav-container');
    if (!header || header.querySelector('.course-search-shell')) return;
    var shell = document.createElement('div');
    shell.className = 'course-search-shell';
    shell.innerHTML = '<label class="course-search-bar"><input class="course-search-inline-input" type="search" aria-label="Search lessons" placeholder="Search" autocomplete="off"></label><div class="course-search-dropdown" hidden></div>';
    header.appendChild(shell);

    var input = shell.querySelector('.course-search-inline-input');
    var results = shell.querySelector('.course-search-dropdown');
    input.addEventListener('input', function () {
      var query = input.value.trim();
      renderSearchResults(input, results, query);
      results.hidden = !query;
    });
    input.addEventListener('focus', function () {
      if (input.value.trim()) {
        renderSearchResults(input, results, input.value.trim());
        results.hidden = false;
      }
    });
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        input.value = '';
        results.hidden = true;
        input.blur();
      }
      if (event.key === 'Enter') {
        var first = results.querySelector('.course-search-result');
        if (first) location.href = first.getAttribute('href');
      }
    });
    document.addEventListener('pointerdown', function (event) {
      if (!shell.contains(event.target)) results.hidden = true;
    });
  }

  function assignConcepts() {
    var concepts = currentPage && currentPage.concepts ? currentPage.concepts : [];
    var sections = Array.prototype.slice.call(document.querySelectorAll('main section'));
    sections.forEach(function (section, index) {
      var concept = concepts[index];
      var heading = section.querySelector('h2');
      if (concept && !section.id) section.id = concept.id;
      if (concept) section.dataset.conceptTitle = concept.title;
      else if (heading && !section.dataset.conceptTitle) section.dataset.conceptTitle = heading.textContent.trim();
    });
  }

  function updateDiveLinks() {
    if (!currentPage || currentPage.type !== 'lesson') return;
    document.querySelectorAll('a[href]').forEach(function (anchor) {
      var parts = localHrefParts(anchor.getAttribute('href'));
      if (!parts) return;
      var target = pages[parts.file];
      var text = anchor.textContent || '';
      var looksLikeDive = target && target.type === 'deepDive' &&
        (/deep(er)?\s+dive|details?|derivation|example/i.test(text) || anchor.classList.contains('deep-dive-link') || anchor.classList.contains('dive-btn'));
      if (!looksLikeDive) return;

      var section = anchor.closest('section');
      var back = currentFile + (section && section.id ? '#' + section.id : '');
      var params = new URLSearchParams(parts.query ? parts.query.slice(1) : '');
      params.set('back', back);
      anchor.setAttribute('href', parts.file + '?' + params.toString() + parts.hash);
      anchor.classList.add('deep-dive-link');
      if (/deep(er)?\s+dive|details?|derivation|example/i.test(text) || anchor.classList.contains('dive-btn')) {
        anchor.innerHTML = '<span aria-hidden="true">+</span> Deep Dive: ' + escapeHtml(cleanDeepDiveTitle(target.title));
      }
    });
  }

  function setupDeepDivePage() {
    if (!currentPage || currentPage.type !== 'deepDive') return;
    document.body.classList.add('deep-dive-page');

    var h1 = document.querySelector('main h1, h1');
    if (h1 && h1.textContent.trim() !== currentPage.title) h1.textContent = currentPage.title;
    if (document.title !== currentPage.title) document.title = currentPage.title;

    var main = document.querySelector('main') || document.body;
    main.querySelectorAll('.deep-dive-return').forEach(function (node) { node.remove(); });
    var backWrap = document.createElement('div');
    backWrap.className = 'deep-dive-return-wrap';
    var back = document.createElement('a');
    back.className = 'deep-dive-return';
    back.href = getBackTarget();
    back.textContent = 'Back to the concept';
    backWrap.appendChild(back);
    main.appendChild(backWrap);
  }

  function setupCourseFooter() {
    var info = projectInfo();
    var footer = document.querySelector('body > footer') || document.querySelector('footer');
    if (!footer) {
      footer = document.createElement('footer');
      document.body.appendChild(footer);
    }
    footer.hidden = false;
    footer.classList.add('course-attribution-footer');
    footer.innerHTML = '';
    if (currentPage && currentPage.type === 'home') {
      footer.innerHTML = '<div class="course-footer-identity">' +
        '<div>' + escapeHtml(info.project) + ' · ' + escapeHtml(info.publisher) + '</div>' +
        '<div>Created by ' + escapeHtml(info.lead_creator) + '</div>' +
        '</div><nav class="course-footer-links" aria-label="Course information">' +
        '<a href="about.html">About / Credits</a>' +
        '</nav>';
    }

  }

  function setupLessonNavigation() {
    if (!currentPage || currentPage.type !== 'lesson') return;
    if (currentFile === 'course_complete.html') return;

    var sectionPage = currentPage.sectionUrl ? pages[localHrefParts(currentPage.sectionUrl)?.file || currentPage.sectionUrl] : null;
    var lessonOrder = sectionPage && Array.isArray(sectionPage.lessons) ? sectionPage.lessons : [];
    var currentIndex = lessonOrder.indexOf(currentFile);
    if (currentIndex < 0) return;

    document.querySelectorAll('[data-lesson-navigation], .lesson-navigation').forEach(function (node) {
      node.remove();
    });

    var previousFile = currentIndex > 0 ? lessonOrder[currentIndex - 1] : null;
    var nextFile = currentIndex < lessonOrder.length - 1 ? lessonOrder[currentIndex + 1] : null;
    if (!previousFile && !nextFile) return;

    var navigation = document.createElement('nav');
    navigation.className = 'lesson-navigation';
    navigation.dataset.lessonNavigation = 'true';
    navigation.setAttribute('aria-label', 'Lesson navigation');

    function addLink(file, label, direction) {
      if (!file) return;
      var page = pages[file];
      var link = document.createElement('a');
      link.className = 'lesson-navigation-link lesson-navigation-' + direction +
        (file === 'course_complete.html' ? ' lesson-navigation-finish' : '');
      link.href = file;
      link.setAttribute('aria-label', label + ': ' + getPageTitle(page));
      link.innerHTML = '<span class="lesson-navigation-icon" aria-hidden="true">' +
        (file === 'course_complete.html' ? '&#10003;' : (direction === 'previous' ? '&#8592;' : '&#8594;')) +
        '</span><span>' + label + '</span>';
      navigation.appendChild(link);
    }

    addLink(previousFile, 'Previous lesson', 'previous');
    addLink(nextFile, nextFile === 'course_complete.html' ? 'Finish' : 'Next lesson', 'next');

    var main = document.querySelector('main') || document.body;
    var footer = main.querySelector(':scope > footer') || document.querySelector('footer');
    if (footer && footer.parentElement === main) main.insertBefore(navigation, footer);
    else main.appendChild(navigation);
  }

  function setupActiveConceptTracking() {
    if (!currentPage || currentPage.type !== 'lesson') return;
    var sections = Array.prototype.slice.call(document.querySelectorAll('main section[id]'));
    if (!sections.length) return;

    function currentFromScroll() {
      var y = window.scrollY + 120;
      var selected = sections[0];
      sections.forEach(function (section) {
        if (section.offsetTop <= y) selected = section;
      });
      var concept = findConceptById(selected.id, currentPage) || {
        id: selected.id,
        title: selected.dataset.conceptTitle || (selected.querySelector('h2') ? selected.querySelector('h2').textContent.trim() : selected.id)
      };
      if (!activeConcept || activeConcept.id !== concept.id) {
        activeConcept = concept;
        renderBreadcrumb(concept);
      }
    }

    currentFromScroll();
    window.addEventListener('scroll', currentFromScroll, { passive: true });
  }

  function scrollToHashAfterIds() {
    if (!location.hash) return;
    var id = decodeURIComponent(location.hash.slice(1));
    var target = document.getElementById(id);
    if (!target) return;
    setTimeout(function () {
      target.scrollIntoView({ block: 'start' });
    }, 30);
  }

  function setupNotationButtons() {
    document.querySelectorAll('[data-notation]').forEach(function (node) {
      var ids = node.getAttribute('data-notation').split(',').map(function (id) { return id.trim(); }).filter(Boolean);
      window.CourseNotation.attach(node, ids);
    });
  }

  function searchCorpus() {
    var list = [];
    Object.keys(pages).forEach(function (file) {
      var page = pages[file];
      if (!page || page.searchable === false || !page.url || page.url === 'search.html') return;

      if (page.type === 'lesson' && Array.isArray(page.concepts) && page.concepts.length) {
        page.concepts.forEach(function (concept) {
          list.push({
            type: 'concept',
            title: displayTitle(concept.title),
            url: page.url + '#' + concept.id,
            section: page.section || '',
            lesson: page.title || '',
            text: [concept.title, concept.searchText || concept.snippet || '', page.title, page.section].join(' '),
            snippet: concept.snippet || concept.searchText || page.snippet || ''
          });
        });
      }

      list.push({
        type: page.type || 'page',
        title: displayTitle(page.title || page.h1 || file),
        url: page.url,
        section: page.section || '',
        lesson: page.lesson || '',
        text: [page.title, page.h1, page.section, page.lesson, (page.headings || []).join(' '), page.searchText || ''].join(' '),
        snippet: page.searchText || page.snippet || ''
      });
    });

    (COURSE.notation || []).forEach(function (entry) {
      list.push({
        type: 'notation',
        title: entry.symbol + ' — ' + entry.label,
        url: entry.introducedIn || 'index.html',
        section: 'Notation',
        lesson: '',
        text: [entry.symbol, entry.id, entry.label].join(' '),
        snippet: 'Notation entry. Opens where this symbol was first introduced.'
      });
    });

    return list;
  }

  function resultMeta(item) {
    var parts = [];
    if (item.section) parts.push(displayTitle(item.section));
    if (item.lesson) parts.push(displayTitle(item.lesson));
    if (item.type === 'concept') parts.push('Concept');
    else if (item.type === 'deepDive') parts.push('Deep dive');
    else if (item.type === 'notation') parts.push('Notation');
    return parts.join(' · ');
  }

  function resultScore(item, terms) {
    var titleWords = wordsFrom(item.title);
    var lessonWords = wordsFrom(item.lesson);
    var textWords = wordsFrom(item.text);
    var total = 0;
    terms.forEach(function (term) {
      var titleHit = titleWords.some(function (word) { return termMatches(term, word); });
      var lessonHit = lessonWords.some(function (word) { return termMatches(term, word); });
      var textHit = textWords.some(function (word) { return termMatches(term, word); });
      if (titleWords.join(' ') === term) total += 30;
      if (titleHit) total += 14;
      if (lessonHit) total += 8;
      if (textHit) total += 4;
      if (!titleHit && !textHit) total -= 24;
    });
    if (item.type === 'concept') total += 5;
    if (item.type === 'lesson') total += 14;
    return total;
  }

  function renderSearchResults(input, results, query) {
    var terms = foldText(query).split(/\s+/).filter(Boolean);
    if (!terms.length) {
      results.innerHTML = '<div class="course-search-empty">Type a word like potential, dipole, flux, or Ampere.</div>';
      return;
    }

    var seen = {};
    var matches = searchCorpus()
      .map(function (item) { return { item: item, score: resultScore(item, terms) }; })
      .filter(function (row) { return row.score > 0; })
      .sort(function (a, b) { return b.score - a.score || a.item.title.localeCompare(b.item.title); })
      .filter(function (row) {
        var key = foldText(row.item.title + '|' + cleanSearchText(row.item.snippet || row.item.text).slice(0, 140));
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      })
      .slice(0, 12);

    if (!matches.length) {
      results.innerHTML = '<div class="course-search-empty">No matching pages found.</div>';
      return;
    }

    results.innerHTML = matches.map(function (row) {
      var item = row.item;
      var snippet = excerpt(item.snippet || item.text, terms);
      var foldedSnippet = foldText(snippet);
      var foldedTitle = foldText(item.title);
      if (foldedTitle && foldedSnippet.indexOf(foldedTitle) === 0) {
        snippet = snippet.slice(item.title.length).replace(/^\s*[-:.;,]?\s*/, '');
      }
      var href = hrefWithFind(item.url, bestFindTerm(item, terms));
      return '<a class="course-search-result" href="' + escapeHtml(href) + '">' +
        '<span class="course-search-result-type">' + escapeHtml(resultMeta(item)) + '</span>' +
        '<strong>' + highlightTerms(item.title, terms) + '</strong>' +
        (snippet ? '<span>' + highlightTerms(snippet, terms) + '</span>' : '') +
        '</a>';
    }).join('');
  }

  function ensureSearchOverlay() {
    var existing = document.querySelector('.course-search-overlay');
    if (existing) return existing;

    var overlay = document.createElement('div');
    overlay.className = 'course-search-overlay';
    overlay.hidden = true;
    overlay.innerHTML = '<div class="course-search-backdrop" data-search-close></div>' +
      '<section class="course-search-modal" role="dialog" aria-modal="true" aria-label="Search course">' +
      '<div class="course-search-input-wrap"><span aria-hidden="true">⌕</span><input class="course-search-modal-input" type="search" placeholder="Search lessons, concepts, formulas..." autocomplete="off"><button type="button" data-search-close aria-label="Close search">×</button></div>' +
      '<div class="course-search-modal-results" aria-live="polite"></div>' +
      '</section>';
    document.body.appendChild(overlay);

    var input = overlay.querySelector('.course-search-modal-input');
    var results = overlay.querySelector('.course-search-modal-results');
    input.addEventListener('input', function () {
      renderSearchResults(input, results, input.value.trim());
    });
    overlay.addEventListener('click', function (event) {
      if (event.target.closest('[data-search-close]')) closeCourseSearch();
    });
    overlay.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeCourseSearch();
    });
    return overlay;
  }

  function openCourseSearch() {
    var overlay = ensureSearchOverlay();
    overlay.hidden = false;
    document.body.classList.add('search-open');
    var input = overlay.querySelector('.course-search-modal-input');
    input.focus();
    input.select();
    renderSearchResults(input, overlay.querySelector('.course-search-modal-results'), input.value.trim());
  }

  function closeCourseSearch() {
    var overlay = document.querySelector('.course-search-overlay');
    if (!overlay) return;
    overlay.hidden = true;
    document.body.classList.remove('search-open');
  }

  window.CourseSearch = {
    open: function (query) {
      var input = document.querySelector('.course-search-inline-input');
      var results = document.querySelector('.course-search-dropdown');
      if (!input || !results) return openCourseSearch();
      if (query) input.value = query;
      input.focus();
      if (input.value.trim()) {
        renderSearchResults(input, results, input.value.trim());
        results.hidden = false;
      }
    },
    close: function () {
      var results = document.querySelector('.course-search-dropdown');
      if (results) results.hidden = true;
      closeCourseSearch();
    }
  };

  function highlightFindTerm() {
    var term = new URLSearchParams(location.search).get('find');
    if (!term || term.length < 2) return;
    var target = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    var root = target || document.querySelector('main') || document.body;
    var lower = foldText(term);
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var parent = node.parentElement;
        if (!parent || /^(SCRIPT|STYLE|TEXTAREA|INPUT|MJX-CONTAINER)$/i.test(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return foldText(node.nodeValue).indexOf(lower) >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });
    var node = walker.nextNode();
    if (!node) return;
    var index = foldText(node.nodeValue).indexOf(lower);
    var range = document.createRange();
    range.setStart(node, index);
    range.setEnd(node, index + term.length);
    var mark = document.createElement('mark');
    mark.className = 'course-find-highlight';
    range.surroundContents(mark);
    setTimeout(function () {
      mark.scrollIntoView({ block: 'center' });
    }, 80);
  }

  function setupResponsiveSimFrames() {
    document.querySelectorAll('iframe').forEach(function (frame) {
      var src = frame.getAttribute('src') || '';
      if (!/(^|\/)(diagrams|simulators)\//.test(src)) return;
      var wrapper = frame.closest('.iframe-container, .sim-container') || frame.parentElement;
      if (!wrapper) return;
      wrapper.classList.add('course-responsive-embed');
      frame.classList.add('course-responsive-frame');
      setupFrameFullscreenControl(wrapper, frame);
      var lowerSrc = src.toLowerCase();
      if (/potential_simulator\.html/i.test(lowerSrc)) {
        wrapper.classList.add('course-canvas-first-embed', 'course-potential-embed');
      } else if (/continuous_potential\.html/i.test(lowerSrc)) {
        wrapper.classList.add('course-canvas-first-embed', 'course-continuous-embed');
      } else if (/conductor_properties_3d\.html/i.test(lowerSrc)) {
        wrapper.classList.add('course-canvas-first-embed', 'course-conductor-lab-embed');
      } else if (/(conductor_induction|faraday_cage)\.html/i.test(lowerSrc)) {
        wrapper.classList.add('course-canvas-first-embed', 'course-conductor-2d-embed');
      } else if (/capacitor_basics\.html/i.test(lowerSrc)) {
        wrapper.classList.add('course-canvas-first-embed', 'course-capacitor-embed');
      } else if (/ch3_1_b_f_v_relation\.html/i.test(lowerSrc)) {
        wrapper.classList.add('course-canvas-first-embed', 'course-lorentz-bfv-embed');
      }
    });
  }

  function setupFrameFullscreenControl(wrapper, frame) {
    if (wrapper.dataset.fullscreenControlReady === 'true') return;
    wrapper.dataset.fullscreenControlReady = 'true';
    wrapper.classList.add('course-fullscreenable-embed');

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'course-fullscreen-button';
    button.textContent = 'Full size';
    button.setAttribute('aria-label', 'Open simulator full size');
    wrapper.appendChild(button);

    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      openFrameFullSize(wrapper, frame);
    });
  }

  function setupContextFeedback() {
    if (!window.CourseFeedback) return;
    window.CourseFeedback.start();
    var footer = document.querySelector('.course-attribution-footer');
    if (!footer) return;
    var isHome = currentPage && currentPage.type === 'home';
    var context = {
      scope: isHome ? 'course' : 'lesson',
      lesson: isHome ? projectInfo().project : getPageTitle(currentPage),
      page_path: currentFile,
      version: projectInfo().version
    };
    footer.appendChild(window.CourseFeedback.form(context, 'Report bug / leave feedback'));
  }

  function openFrameFullSize(wrapper, frame) {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(function () {});
      return;
    }

    wrapper.classList.add('course-fullscreen-active');
    var fullscreenTarget = wrapper;
    if (fullscreenTarget.requestFullscreen) {
      fullscreenTarget.requestFullscreen().catch(function () {
        wrapper.classList.remove('course-fullscreen-active');
        openFrameFullSizeModal(frame);
      });
      return;
    }

    openFrameFullSizeModal(frame);
  }

  document.addEventListener('fullscreenchange', function () {
    document.querySelectorAll('.course-fullscreen-active').forEach(function (wrapper) {
      if (document.fullscreenElement !== wrapper) {
        wrapper.classList.remove('course-fullscreen-active');
      }
    });
    document.querySelectorAll('.course-fullscreen-button').forEach(function (button) {
      var wrapper = button.closest('.course-fullscreenable-embed');
      var active = wrapper && document.fullscreenElement === wrapper;
      button.textContent = active ? 'Back' : 'Full size';
      button.setAttribute('aria-label', active ? 'Exit full size simulator' : 'Open simulator full size');
    });
  });

  function openFrameFullSizeModal(frame) {
    var src = frame.getAttribute('src');
    if (!src) return;

    var overlay = document.createElement('div');
    overlay.className = 'course-fullscreen-modal';
    overlay.innerHTML =
      '<div class="course-fullscreen-modal-bar">' +
      '<span>Full size simulator</span>' +
      '<button type="button" class="course-fullscreen-close">Back</button>' +
      '</div>' +
      '<iframe class="course-fullscreen-modal-frame" src="' + escapeHtml(src) + '" title="' + escapeHtml(frame.getAttribute('title') || 'Simulator') + '"></iframe>';

    function close() {
      document.body.classList.remove('course-fullscreen-modal-open');
      overlay.remove();
      document.removeEventListener('keydown', onKeyDown);
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') close();
    }

    overlay.querySelector('.course-fullscreen-close').addEventListener('click', close);
    document.addEventListener('keydown', onKeyDown);
    document.body.appendChild(overlay);
    document.body.classList.add('course-fullscreen-modal-open');
  }

  function init() {
    if (/\/(diagrams|simulators)\//.test(location.pathname)) return;
    ensureGlobalStyles();
    document.body.classList.add('course-page');
    assignConcepts();
    renderBreadcrumb();
    updateDiveLinks();
    setupDeepDivePage();
    setupCourseFooter();
    setupLessonNavigation();
    supportReady.then(setupContextFeedback);
    setupActiveConceptTracking();
    setupNotationButtons();
    setupResponsiveSimFrames();
    scrollToHashAfterIds();
    highlightFindTerm();
  }

  window.CourseNotation = {
    entries: COURSE.notation || [],
    find: function (id) {
      return this.entries.find(function (entry) { return entry.id === id || entry.symbol === id; });
    },
    attach: function (target, ids) {
      if (!target || target.dataset.notationAttached === 'true') return;
      var entries = (ids || []).map(this.find, this).filter(Boolean);
      if (!entries.length) return;
      target.dataset.notationAttached = 'true';

      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'notation-toggle';
      button.textContent = 'Show notation';

      var panel = document.createElement('div');
      panel.className = 'notation-panel';
      panel.hidden = true;
      panel.innerHTML = '<h3>Notation used here</h3>' + entries.map(function (entry) {
        var link = entry.introducedIn ? '<a href="' + entry.introducedIn + '">first introduced</a>' : '';
        return '<div class="notation-row"><strong>' + entry.symbol + '</strong><span>' + entry.label + '</span>' + link + '</div>';
      }).join('');

      button.addEventListener('click', function () {
        panel.hidden = !panel.hidden;
        button.textContent = panel.hidden ? 'Show notation' : 'Hide notation';
      });

      target.insertAdjacentElement('afterend', panel);
      target.insertAdjacentElement('afterend', button);
    }
  };

  ready(init);
})();
