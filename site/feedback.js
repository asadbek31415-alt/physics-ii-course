/* Optional student opinions. No visits, simulator events or personal IDs are collected. */
(function (root) {
  'use strict';
  var PREFIX = 'physics-ii-opinion:';
  var RESPONSE_PREFIX = 'physics-ii-opinion-response:';
  var LAST_PREFIX = 'physics-ii-opinion-last:';

  function createQueue(options) {
    var flushing = null;
    function pending() {
      var items = [];
      for (var i = 0; i < options.storage.length; i++) {
        var key = options.storage.key(i);
        if (key.indexOf(PREFIX) !== 0) continue;
        try {
          var item = JSON.parse(options.storage.getItem(key));
          if (item && key === PREFIX + (item.event_id || item.id)) items.push(item);
        } catch (_) { /* Leave unreadable entries intact rather than deleting data. */ }
      }
      return items;
    }
    function enqueue(data) {
      if (pending().length >= 200) throw new Error('There are too many unsent responses on this device. Please connect and try again.');
      var item = Object.assign({}, data, { event_id: options.uuid(), submitted_at: new Date().toISOString() });
      if (!item.id) item.id = options.uuid();
      options.storage.setItem(PREFIX + item.event_id, JSON.stringify(item));
      return item.event_id;
    }
    async function upload() {
      var endpoint = options.endpoint();
      if (!endpoint) return;
      var items = pending();
      for (var item of items) {
        var controller = new AbortController();
        var timer = setTimeout(function () { controller.abort(); }, 8000);
        try {
          var response = await options.fetch(endpoint, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            credentials: 'omit', referrerPolicy: 'no-referrer',
            body: JSON.stringify(item), signal: controller.signal
          });
          if (!response.ok) return;
          var acknowledgment = await response.json();
          if (acknowledgment.id !== item.id) return;
          // Per-response keys avoid overwriting another tab's newly queued response.
          options.storage.removeItem(PREFIX + (item.event_id || item.id));
        } catch (_) { return; }
        finally { clearTimeout(timer); }
      }
    }
    function flush() {
      if (!flushing) flushing = upload().finally(function () { flushing = null; });
      return flushing;
    }
    return { enqueue: enqueue, flush: flush, pending: pending };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createQueue: createQueue };
    return;
  }
  var queue;
  var started = false;
  var statuses = new Map();
  function endpoint() {
    var value = (root.PHYSICS_II_FEEDBACK_CONFIG || {}).FEEDBACK_ENDPOINT;
    return value && value !== 'PLACEHOLDER' ? value : '';
  }
  function getQueue() {
    if (!queue) queue = createQueue({
      storage: root.localStorage,
      fetch: root.fetch.bind(root),
      endpoint: endpoint,
      uuid: function () { return root.crypto.randomUUID(); }
    });
    return queue;
  }
  function responseKey(context) {
    return [context.scope, context.page_path, context.lesson].join('|').replace(/[^\w|.-]+/g, '_');
  }
  function storedResponseId(context) {
    var key = RESPONSE_PREFIX + responseKey(context);
    var id = root.localStorage.getItem(key);
    if (!id) {
      id = root.crypto.randomUUID();
      root.localStorage.setItem(key, id);
    }
    return id;
  }
  function lastKey(context) {
    return LAST_PREFIX + responseKey(context);
  }
  function readLast(context) {
    try { return JSON.parse(root.localStorage.getItem(lastKey(context)) || 'null'); }
    catch (_) { return null; }
  }
  function writeLast(context, data) {
    root.localStorage.setItem(lastKey(context), JSON.stringify({
      rating: data.rating,
      score: data.score || '',
      comment: data.comment,
      fields: data.fields || null
    }));
  }
  async function sync() {
    try {
      await getQueue().flush();
      var pending = new Set(getQueue().pending().map(function (item) { return item.id; }));
      statuses.forEach(function (node, id) {
        if (!pending.has(id)) {
          node.textContent = 'Thank you. Your response was sent.';
          statuses.delete(id);
        }
      });
    } catch (_) { /* Storage may be unavailable; explicit submissions show the error. */ }
  }
  function start() {
    if (started) return;
    started = true;
    sync();
    root.addEventListener('online', sync);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') sync();
    });
    root.setInterval(function () {
      if (document.visibilityState === 'visible') sync();
    }, 60000);
  }
  function form(context, label) {
    var last = readLast(context);
    var details = document.createElement('details');
    details.className = 'opinion-feedback';
    var summary = document.createElement('summary');
    summary.textContent = label;
    details.appendChild(summary);
    var form = document.createElement('form');
    form.className = 'opinion-form';
    var subject = context.scope === 'course' ? 'course' : 'page';
    form.innerHTML = '<small class="opinion-context"></small>' +
      '<fieldset><legend>' + (context.scope === 'course' ? 'Was this course useful to you?' : 'Was this page useful and working well?') +
      '</legend><div class="opinion-options">' +
      ['Yes', 'Somewhat', 'No'].map(function (value) {
        return '<label><input type="radio" name="rating" value="' + value + '" required> ' + value + '</label>';
      }).join('') + '</div></fieldset>' +
      '<label>Feedback or bug report (optional)<textarea name="comment" rows="3" maxlength="2000" placeholder="What was useful, unclear, broken, or wrong on this ' + subject + '?"></textarea></label>' +
      '<small>Your response is shared with the course author. This form automatically includes the page name. Offline responses are saved on this device and sent when you next open the course online.</small>' +
      '<button type="submit">Send</button><p role="status"></p>';
    enableRadioClear(form);
    form.querySelector('.opinion-context').textContent = context.lesson;
    if (last) {
      var checked = form.querySelector('input[name="rating"][value="' + last.rating + '"]');
      if (checked) checked.checked = true;
      form.querySelector('textarea').value = last.comment || '';
      form.querySelector('button').textContent = 'Send update';
    }
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var button = form.querySelector('button');
      var status = form.querySelector('[role="status"]');
      button.disabled = true;
      try {
        var data = new FormData(form);
        var response = Object.assign({}, context, {
          id: storedResponseId(context),
          rating: data.get('rating'), score: '', comment: data.get('comment').trim()
        });
        var id = getQueue().enqueue(response);
        writeLast(context, response);
        status.textContent = endpoint() ? 'Saved; will send when connected.' :
          'Saved on this device. Sending is not configured in this copy of the course.';
        statuses.set(id, status);
        button.textContent = 'Send update';
        await sync();
        if (!getQueue().pending().some(function (item) { return (item.event_id || item.id) === id; })) {
          status.textContent = 'Thank you. Your response was sent. You can edit it and send an update.';
        }
      } catch (_) {
        status.textContent = 'Your response could not be saved. Keep this page open and try again; browser storage may be full or unavailable.';
      }
      button.disabled = false;
    });
    details.appendChild(form);
    return details;
  }
  function enableRadioClear(form) {
    form.querySelectorAll('input[type="radio"]').forEach(function (input) {
      input.addEventListener('pointerdown', function () {
        input._wasChecked = input.checked;
      });
      input.addEventListener('keydown', function (event) {
        if (event.key === ' ' || event.key === 'Spacebar') input._wasChecked = input.checked;
      });
      input.addEventListener('click', function () {
        if (input._wasChecked) {
          input.checked = false;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        input._wasChecked = false;
      });
    });
  }
  async function submit(context, fields) {
    start();
    var response = Object.assign({}, context, fields, {
      id: storedResponseId(context),
      score: fields.score || '',
      comment: String(fields.comment || '').trim()
    });
    var eventId = getQueue().enqueue(response);
    writeLast(context, response);
    await sync();
    return {
      eventId: eventId,
      pending: getQueue().pending().some(function (item) {
        return (item.event_id || item.id) === eventId;
      })
    };
  }
  root.CourseFeedback = { start: start, form: form, submit: submit, readLast: readLast, enableRadioClear: enableRadioClear };
})(typeof window === 'undefined' ? this : window);
