// Settings drawer. Reads and writes through window.sitePrefs (js/prefs.js).
(() => {
  const prefs = window.sitePrefs
  if (!prefs) return

  const osReducesMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

  const radios = (name, options) => options
    .map(([value, label, extra = '']) => `
      <label class="sg__opt">
        <input type="radio" name="${name}" value="${value}" />
        <span ${extra}>${label}</span>
      </label>`).join('')

  const wrap = document.createElement('div')
  wrap.innerHTML = `
  <button type="button" class="settings-tab" data-open-settings aria-haspopup="dialog" aria-label="Open settings">
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/><circle cx="9" cy="7" r="2.2" fill="var(--surface)"/><circle cx="15" cy="12" r="2.2" fill="var(--surface)"/><circle cx="8" cy="17" r="2.2" fill="var(--surface)"/></svg>
    <span>Settings</span>
  </button>
  <div class="settings-scrim" hidden></div>
  <aside class="settings" role="dialog" aria-modal="true" aria-labelledby="settings-title" hidden>
    <div class="settings__head">
      <h2 id="settings-title">Settings</h2>
      <button type="button" class="settings__close" aria-label="Close settings">&times;</button>
    </div>
    <div class="settings__body">
      <fieldset class="sg">
        <legend>Appearance</legend>
        <div class="sg__row">${radios('mode', [['light', 'Light'], ['dark', 'Dark'], ['system', 'System']])}</div>
        <p class="sg__hint">System follows your device setting.</p>
      </fieldset>

      <fieldset class="sg">
        <legend>Text size</legend>
        <div class="sg__row">${radios('size', [
          ['90', 'Aa', 'style="font-size:13px"'], ['100', 'Aa', 'style="font-size:16px"'],
          ['115', 'Aa', 'style="font-size:19px"'], ['130', 'Aa', 'style="font-size:22px"'],
        ])}</div>
        <p class="sg__hint">Small, default, large, extra large. Scales the whole page.</p>
      </fieldset>

      <fieldset class="sg">
        <legend>Contrast</legend>
        <div class="sg__row">${radios('contrast', [['standard', 'Standard'], ['high', 'High']])}</div>
      </fieldset>

      <fieldset class="sg">
        <legend>Reading</legend>
        <label class="sg__switch"><input type="checkbox" name="motion" /><span>Reduce motion</span></label>
        <p class="sg__hint" id="motion-hint" hidden>On because your device asks for less motion.</p>
        <label class="sg__switch"><input type="checkbox" name="links" /><span>Underline all links</span></label>
        <label class="sg__switch"><input type="checkbox" name="font" /><span>Plain system font</span></label>
      </fieldset>
    </div>
    <div class="settings__foot">
      <button type="button" class="settings__reset">Reset to defaults</button>
      <p class="sg__hint">Saved in this browser only.</p>
    </div>
  </aside>`
  document.body.append(...wrap.children)

  const $ = (sel) => document.querySelector(sel)
  const drawer = $('.settings')
  const scrim = $('.settings-scrim')
  const closeBtn = $('.settings__close')
  let opener = null

  function sync() {
    const s = prefs.get()
    for (const name of ['mode', 'size', 'contrast']) {
      const r = drawer.querySelector(`input[name="${name}"][value="${s[name]}"]`)
      if (r) r.checked = true
    }
    const motion = drawer.querySelector('input[name="motion"]')
    motion.checked = s.motion === 'reduce' || osReducesMotion
    motion.disabled = osReducesMotion
    $('#motion-hint').hidden = !osReducesMotion
    drawer.querySelector('input[name="links"]').checked = s.links === 'underline'
    drawer.querySelector('input[name="font"]').checked = s.font === 'plain'
  }

  function open(from) {
    opener = from || document.activeElement
    drawer.hidden = false
    scrim.hidden = false
    void drawer.offsetWidth // force a layout so the slide-in transition runs
    drawer.classList.add('is-open')
    scrim.classList.add('is-open')
    sync()
    closeBtn.focus()
    document.querySelectorAll('[data-open-settings]').forEach((b) => b.setAttribute('aria-expanded', 'true'))
  }

  function close() {
    drawer.classList.remove('is-open')
    scrim.classList.remove('is-open')
    document.querySelectorAll('[data-open-settings]').forEach((b) => b.setAttribute('aria-expanded', 'false'))
    setTimeout(() => { drawer.hidden = true; scrim.hidden = true }, 220)
    if (opener) opener.focus()
  }

  document.querySelectorAll('[data-open-settings]').forEach((b) => b.addEventListener('click', () => open(b)))
  closeBtn.addEventListener('click', close)
  scrim.addEventListener('click', close)

  drawer.addEventListener('change', (e) => {
    const t = e.target
    if (t.type === 'radio') prefs.set(t.name, t.value)
    else if (t.name === 'motion') prefs.set('motion', t.checked ? 'reduce' : 'system')
    else if (t.name === 'links') prefs.set('links', t.checked ? 'underline' : 'default')
    else if (t.name === 'font') prefs.set('font', t.checked ? 'plain' : 'default')
  })

  $('.settings__reset').addEventListener('click', () => { prefs.reset(); sync() })

  // Escape closes. Tab stays inside the drawer while it is open.
  document.addEventListener('keydown', (e) => {
    if (drawer.hidden) return
    if (e.key === 'Escape') { close(); return }
    if (e.key !== 'Tab') return
    const items = [...drawer.querySelectorAll('button, input:not([disabled])')]
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  })
})()
