// Agent 37X: the AI chat assistant on Team 37X's sponsorship site (Darren, 2026-10-09). Built from
// Agent E (emmakao.com). Answers only from the team site and the tournaments the team is registered for,
// via https://www.walvis.ca/agent-37x/ask.php (this site is static, so the handler lives on walvis.ca;
// its CORS allows only this site). Near the end of a conversation, or when someone wants to sponsor or
// reach the team, it offers to pass the team a message: name, email and message are asked in the chat
// and posted to https://www.walvis.ca/agent-37x/send.php (spam checks + encryption there; Friday delivers).
// Self-sufficient: loads its own stylesheet. One tag per page:
//   <script src="assets/agent-37x/agent-37x.js?v=N" defer></script>
// Source of truth for the handler, rules and docs: Darren's family-contact/agent-37x/ (README there).
(() => {
  'use strict';
  if (document.getElementById('agent-37x')) return;
  const me = document.currentScript && document.currentScript.src;
  const API = 'https://www.walvis.ca/agent-37x/';
  const endpoint = API + 'ask.php';
  const sendUrl = API + 'send.php';
  const contactPage = '#contact';
  const page = 'vex37';
  const ver = me ? (new URL(me).searchParams.get('v') || '1') : '1';
  if (!document.querySelector('link[data-agent-37x]')) {
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = new URL('agent-37x.css?v=' + ver, me || location.href).href; css.dataset.agent37x = '';
    document.head.appendChild(css);
  }

  // The site is English; a visitor whose browser prefers French gets the French interface.
  // The answers follow the language of each question either way.
  const uiLang = () => ((navigator.languages && navigator.languages[0]) || navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
  const S = {
    en: {
      launch: 'Agent 37X · AI assistant', ai: 'AI', title: 'Agent 37X', sub: "AI assistant · answers from the team's site",
      hi: "Hey! I'm Agent 37X, an AI assistant that answers from Team 37X's site. Ask me about our tournaments, the robot, our wins or sponsoring the team.",
      scope: "I stick to what's on this site, so I'll pass on anything else.",
      chips: ['Which tournaments are you registered for?', 'How can I sponsor the team?', 'Who is on the team?'],
      ph: 'Ask about Team 37X', send: 'Send', close: 'Close Agent 37X', typing: 'Agent 37X is typing',
      note: "AI can make mistakes. Please don't share private information. Harmful messages may be logged with your IP address.", form: 'Get in touch',
      offer: 'Want me to pass a message to the team?', yes: 'Yes, please', no: 'No thanks',
      noOk: 'No problem! Ask me anything else about 37X.',
      askName: "Awesome! What's your name?", phName: 'Your name',
      askEmail: n => `Nice to meet you, ${n}. What email should the team reply to?`, phEmail: 'you@example.com',
      badEmail: "Hmm, that doesn't look like an email address. Could you check it?",
      askMsg: 'And what would you like to tell the team?', phMsg: 'Your message',
      shortMsg: 'Could you write a little more? At least 10 characters.',
      summary: 'Here is what I will send to the team:', lName: 'Name', lEmail: 'Email', lMsg: 'Message',
      sendIt: 'Send', cancel: 'Cancel', cancelled: "Okay, I won't send it.",
      sending: 'Sending…', sent: "Done! Your message is on its way to the team.",
      sendFail: 'That did not go through: ', offline: "I can't reach the server right now. The Get in touch section has other ways to reach the team.",
      down: "Agent 37X can't be reached right now.", cancelWord: /^(cancel|stop|never ?mind|annuler)$/i,
    },
    fr: {
      launch: 'Agent 37X · assistant IA', ai: 'IA', title: 'Agent 37X', sub: "Assistant IA · répond à partir du site de l'équipe",
      hi: "Salut ! Je suis Agent 37X, un assistant IA qui répond à partir du site de l'équipe 37X. Posez-moi des questions sur nos tournois, le robot, nos victoires ou les commandites.",
      scope: "Je m'en tiens à ce site : le reste, je le laisse passer.",
      chips: ["À quels tournois l'équipe est-elle inscrite ?", "Comment commanditer l'équipe ?", "Qui fait partie de l'équipe ?"],
      ph: "Une question sur l'équipe 37X", send: 'Envoyer', close: 'Fermer Agent 37X', typing: 'Agent 37X écrit',
      note: "L'IA peut se tromper. Ne partagez pas d'informations privées. Les messages malveillants peuvent être enregistrés avec votre adresse IP.", form: 'Nous joindre',
      offer: "Voulez-vous que je transmette un message à l'équipe ?", yes: 'Oui, merci', no: 'Non merci',
      noOk: "Pas de souci ! Autre chose sur l'équipe 37X ?",
      askName: 'Super ! Quel est votre nom ?', phName: 'Votre nom',
      askEmail: n => `Enchanté, ${n}. À quelle adresse courriel l'équipe peut-elle vous répondre ?`, phEmail: 'vous@exemple.com',
      badEmail: "Hum, cette adresse courriel ne semble pas valide. Pouvez-vous vérifier ?",
      askMsg: "Et que voulez-vous dire à l'équipe ?", phMsg: 'Votre message',
      shortMsg: 'Pouvez-vous écrire un peu plus ? Au moins 10 caractères.',
      summary: "Voici ce que je vais envoyer à l'équipe :", lName: 'Nom', lEmail: 'Courriel', lMsg: 'Message',
      sendIt: 'Envoyer', cancel: 'Annuler', cancelled: "D'accord, je ne l'envoie pas.",
      sending: 'Envoi…', sent: "Voilà ! Votre message est en route vers l'équipe.",
      sendFail: "L'envoi n'a pas fonctionné : ", offline: "Je ne joins pas le serveur. La section Get in touch du site donne d'autres moyens de joindre l'équipe.",
      down: "Agent 37X est injoignable pour l'instant.", cancelWord: /^(cancel|stop|annuler|laisse tomber)$/i,
    },
  };
  let L = S[uiLang()];

  const root = document.createElement('div');
  root.id = 'agent-37x';
  root.dataset.floating = 'true';   // floats over content on purpose; verify-page skips it for overlap
  const build = () => {
    root.innerHTML = `
    <button type="button" class="ae-launch" aria-expanded="false" aria-controls="ae-panel" aria-label="${L.launch}">
      <span class="ae-mark" aria-hidden="true">37X</span><span class="ae-launch-text">${L.launch}</span><span class="ae-ai" aria-hidden="true">${L.ai}</span>
    </button>
    <section class="ae-panel" id="ae-panel" role="dialog" aria-modal="false" aria-labelledby="ae-title" hidden>
      <header class="ae-head">
        <span class="ae-mark ae-mark--live" aria-hidden="true">37X</span>
        <div class="ae-id"><h2 class="ae-title" id="ae-title">${L.title}</h2><p class="ae-sub">${L.sub}</p></div>
        <button type="button" class="ae-icon ae-close" aria-label="${L.close}">
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg>
        </button>
      </header>
      <div class="ae-log" role="log" aria-live="polite" aria-relevant="additions">
        <div class="ae-msg ae-bot"><p>${L.hi}</p><p class="ae-scope">${L.scope}</p></div>
        <div class="ae-chips">${L.chips.map(c => `<button type="button">${c}</button>`).join('')}</div>
      </div>
      <form class="ae-form">
        <label for="ae-q" class="ae-sr">${L.ph}</label>
        <textarea id="ae-q" rows="1" maxlength="500" placeholder="${L.ph}"></textarea>
        <button type="submit" class="ae-send" aria-label="${L.send}">
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h13M11 4l6 6-6 6"/></svg>
        </button>
      </form>
      <p class="ae-note">${L.note}</p>
    </section>`;
  };
  build();
  document.body.appendChild(root);

  const $ = s => root.querySelector(s);
  const launch = $('.ae-launch'), panel = $('.ae-panel'), log = $('.ae-log'), form = $('.ae-form'), q = $('#ae-q'), send = $('.ae-send');
  const history = [];          // the last few turns go with each question, so follow-ups keep their context
  let started = 0;             // when the conversation started (ms): the contact form's time trap "t"
  let answers = 0, offered = false;
  let flagged = false;         // a harmful message was flagged by ask.php: no message offer, no follow-ups, for the rest of the visit
  let mode = 'chat';           // chat | name | email | message | confirm
  const draft = { name: '', email: '', message: '' };

  const phone = () => window.matchMedia('(max-width: 640px)').matches;
  const open = show => {
    if (show && !started) started = Date.now();
    // the visitor may have switched EN/FR on the page before opening: redo the greeting while nothing was asked
    if (show && !history.length && mode === 'chat' && S[uiLang()] !== L) relabel();
    panel.hidden = !show;
    launch.setAttribute('aria-expanded', String(show));
    root.classList.toggle('ae-open', show);
    document.documentElement.classList.toggle('ae-locked', show && phone());
    if (show) { if (phone()) $('.ae-close').focus({ preventScroll: true }); else q.focus(); }
    else launch.focus({ preventScroll: true });
  };
  const relabel = () => {
    L = S[uiLang()];
    launch.querySelector('.ae-launch-text').textContent = L.launch;
    launch.querySelector('.ae-ai').textContent = L.ai;
    launch.setAttribute('aria-label', L.launch);
    $('.ae-sub').textContent = L.sub;
    $('.ae-close').setAttribute('aria-label', L.close);
    log.innerHTML = `<div class="ae-msg ae-bot"><p>${L.hi}</p><p class="ae-scope">${L.scope}</p></div>`;
    chips(L.chips);
    setPh(L.ph); $('.ae-note').textContent = L.note; send.setAttribute('aria-label', L.send);
  };
  launch.addEventListener('click', () => open(panel.hidden));
  $('.ae-close').addEventListener('click', () => open(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) open(false); });

  const fit = () => { q.style.height = 'auto'; q.style.height = Math.min(q.scrollHeight, 130) + 'px'; };
  q.addEventListener('input', fit);
  const setPh = t => { q.placeholder = t; $('label[for="ae-q"]').textContent = t; };

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const render = text => {          // **bold** and short "- " lists; everything escaped first
    const out = []; let list = [];
    const flush = () => { if (list.length) { out.push('<ul>' + list.map(i => `<li>${i}</li>`).join('') + '</ul>'); list = []; } };
    for (const raw of esc(text).split(/\n+/)) {
      const line = raw.trim().replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      if (!line) continue;
      const m = line.match(/^[-•*]\s+(.*)$/);
      if (m) list.push(m[1]); else { flush(); out.push(`<p>${line}</p>`); }
    }
    flush();
    return out.join('');
  };
  const scroll = () => { log.scrollTop = log.scrollHeight; };
  const add = (cls, html) => {
    const d = document.createElement('div');
    d.className = 'ae-msg ' + cls; d.innerHTML = html;
    log.appendChild(d); scroll();
    return d;
  };
  const chips = list => {
    const old = log.querySelector('.ae-chips'); if (old) old.remove();
    if (!list || !list.length) return;
    const d = document.createElement('div');
    d.className = 'ae-chips';
    for (const t of list) { const b = document.createElement('button'); b.type = 'button'; b.textContent = t; d.appendChild(b); }
    log.appendChild(d); scroll();
  };
  const actions = (btns) => {        // Yes/No, Send/Cancel: buttons under the last message
    const old = log.querySelector('.ae-actions'); if (old) old.remove();
    const d = document.createElement('div');
    d.className = 'ae-actions';
    for (const [label, fn, primary] of btns) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
      if (primary) b.className = 'ae-primary';
      b.addEventListener('click', () => { d.remove(); fn(); });
      d.appendChild(b);
    }
    log.appendChild(d); scroll();
    d.querySelector('button').focus({ preventScroll: true });
  };
  const clearActions = () => { const old = log.querySelector('.ae-actions'); if (old) old.remove(); };

  // ── offer to pass the team a message ──
  const offer = () => {
    offered = true;
    chips(null);
    add('ae-bot', `<p>${esc(L.offer)}</p>`);
    actions([[L.yes, startMessage, true], [L.no, () => { add('ae-me', `<p>${esc(L.no)}</p>`); add('ae-bot', `<p>${esc(L.noOk)}</p>`); }]]);
  };
  const startMessage = () => {
    add('ae-me', `<p>${esc(L.yes)}</p>`);
    mode = 'name'; add('ae-bot', `<p>${esc(L.askName)}</p>`); setPh(L.phName); q.maxLength = 120; q.focus();
  };
  const endMessage = () => { mode = 'chat'; setPh(L.ph); q.maxLength = 500; };
  const step = text => {
    add('ae-me', `<p>${esc(text)}</p>`);
    if (L.cancelWord.test(text.trim())) { endMessage(); add('ae-bot', `<p>${esc(L.cancelled)}</p>`); return; }
    if (mode === 'name') {
      draft.name = text.slice(0, 120);
      mode = 'email'; add('ae-bot', `<p>${esc(L.askEmail(draft.name))}</p>`); setPh(L.phEmail); q.maxLength = 200;
    } else if (mode === 'email') {
      const e = text.trim();
      if (!/^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[A-Za-z]{2,}$/.test(e) || e.length > 200) { add('ae-bot', `<p>${esc(L.badEmail)}</p>`); return; }
      draft.email = e;
      mode = 'message'; add('ae-bot', `<p>${esc(L.askMsg)}</p>`); setPh(L.phMsg); q.maxLength = 6000;
    } else if (mode === 'message') {
      if (text.trim().length < 10) { add('ae-bot', `<p>${esc(L.shortMsg)}</p>`); return; }
      draft.message = text.trim();
      mode = 'confirm'; setPh(L.ph);
      add('ae-bot ae-summary', `<p>${esc(L.summary)}</p><dl><dt>${esc(L.lName)}</dt><dd>${esc(draft.name)}</dd>`
        + `<dt>${esc(L.lEmail)}</dt><dd>${esc(draft.email)}</dd><dt>${esc(L.lMsg)}</dt><dd>${esc(draft.message).replace(/\n/g, '<br>')}</dd></dl>`);
      actions([[L.sendIt, deliver, true], [L.cancel, () => { endMessage(); add('ae-me', `<p>${esc(L.cancel)}</p>`); add('ae-bot', `<p>${esc(L.cancelled)}</p>`); }]]);
    }
  };
  // Posted like a contact form: name, email, message, the empty honeypot and the time stamp (send.php's time trap).
  const deliver = async () => {
    const wait = add('ae-bot', `<p>${esc(L.sending)}</p>`);
    const fd = new FormData();
    fd.append('name', draft.name); fd.append('email', draft.email); fd.append('message', draft.message);
    fd.append('website', ''); fd.append('t', String(started || Date.now()));
    try {
      const r = await fetch(sendUrl, { method: 'POST', body: fd });
      const j = await r.json().catch(() => ({ ok: false }));
      wait.remove();
      if (j && j.ok) { add('ae-bot', `<p>${esc(L.sent)}</p>`); draft.name = draft.email = draft.message = ''; endMessage(); }
      else {
        add('ae-bot', `<p>${esc(L.sendFail + ((j && j.error) || '?'))}</p><a class="ae-link" href="${contactPage}">${esc(L.form)}</a>`);
        mode = 'confirm';
        actions([[L.sendIt, deliver, true], [L.cancel, () => { endMessage(); add('ae-bot', `<p>${esc(L.cancelled)}</p>`); }]]);
      }
    } catch (e) {
      wait.remove();
      add('ae-bot', `<p>${esc(L.offline)}</p><a class="ae-link" href="${contactPage}">${esc(L.form)}</a>`);
      endMessage();
    }
  };

  const ask = async text => {
    text = text.trim();
    if (!text || send.disabled) return;
    chips(null); clearActions();
    q.value = ''; fit();
    if (mode === 'confirm') { endMessage(); }
    if (mode !== 'chat') { step(text); return; }
    add('ae-me', `<p>${esc(text)}</p>`);
    send.disabled = true;
    const wait = add('ae-bot ae-typing', `<span></span><span></span><span></span><span class="ae-sr">${L.typing}</span>`);
    let reply = '', j = {};
    try {
      const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, history: history.slice(-4), page, lang: uiLang() }) });
      j = await r.json().catch(() => ({}));
      wait.remove();
      reply = j.answer || L.down;
      let out = render(reply);
            add('ae-bot', out);
      if (j.flagged) flagged = true;
      else if (j.ok && !j.declined && !j.offer) answers++;
    } catch (e) {
      wait.remove();
      add('ae-bot', `<p>${esc(L.down)}</p><a class="ae-link" href="${contactPage}">${esc(L.form)}</a>`);
    }
    history.push({ role: 'user', text }); if (reply) history.push({ role: 'assistant', text: reply });
    send.disabled = false;
    // the visitor asked for it (contact details, thanks, bye), or a few good answers in: offer once
    if (flagged) { /* calm reply only: no offer, no follow-ups */ }
    else if (j.offer || (answers >= 3 && !offered)) offer();
    else chips(j.followups);
    if (!phone() && mode === 'chat' && !log.querySelector('.ae-actions')) q.focus();
  };
  form.addEventListener('submit', e => { e.preventDefault(); ask(q.value); });
  q.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(q.value); } });
  log.addEventListener('click', e => { const b = e.target.closest('.ae-chips button'); if (b) ask(b.textContent); });
  log.addEventListener('click', e => { if (e.target.closest('.ae-link')) open(false); });   // "Get in touch" jumps to the page's contact section
})();
