import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import jqueryFactory from 'jquery';

function loadModalStack() {
  const src = readFileSync('src/assets/ModalStack.js', 'utf8');
  // eslint-disable-next-line no-new-func
  new Function('window', 'jQuery', src)(globalThis.window, globalThis.jQuery);
  return globalThis.window.ModalStack;
}

beforeEach(() => {
  // jQuery v4's ESM node wrapper (node_modules/jquery/dist-module/wrappers/
  // jquery.node-module-wrapper.js) already binds itself to the jsdom global
  // `window`/`document` at import time -- it is NOT the classic v3
  // `require('jquery')(window)` factory. Calling it as a factory here would
  // invoke `$(window)`, returning a jQuery *collection* (typeof 'object')
  // wrapping the window, not the `$` function itself. So assign it directly.
  globalThis.jQuery = globalThis.$ = jqueryFactory;
});

describe('jQuery jsdom bootstrap sanity', () => {
  it('provides a working jQuery bound to the jsdom window', () => {
    document.body.innerHTML = '<div class="modal"><div class="modal-body"><a id="x"></a></div></div>';
    expect(typeof globalThis.jQuery).toBe('function');
    expect(globalThis.jQuery('#x').closest('.modal').length).toBe(1);
  });
});

describe('ModalStack z-index arithmetic', () => {
  let ModalStack;
  beforeEach(() => { ModalStack = loadModalStack(); });

  it('puts level 0 on the Bootstrap defaults', () => {
    expect(ModalStack.modalZIndex(0)).toBe(1055);
    expect(ModalStack.backdropZIndex(0)).toBe(1050);
  });

  it("makes each level's backdrop out-paint the level below's dialog", () => {
    expect(ModalStack.backdropZIndex(1)).toBeGreaterThan(ModalStack.modalZIndex(0));
    expect(ModalStack.backdropZIndex(2)).toBeGreaterThan(ModalStack.modalZIndex(1));
  });

  it("keeps each level's dialog above its own backdrop", () => {
    for (let n = 0; n < 5; n++) {
      expect(ModalStack.modalZIndex(n)).toBeGreaterThan(ModalStack.backdropZIndex(n));
    }
  });
});

describe('ModalStack.classifyIntent', () => {
  let ModalStack;
  beforeEach(() => {
    ModalStack = loadModalStack();
    document.body.innerHTML = `
      <a id="host" role="modal-remote" href="/x">host page link</a>
      <div class="modal" id="m0">
        <div class="modal-dialog"><div class="modal-content">
          <div class="modal-body">
            <a id="bodyLink" role="modal-remote" href="/add-member">Add member</a>
            <a id="bodyStep" role="modal-remote" data-modal-step href="/y">forced step</a>
          </div>
          <div class="modal-footer">
            <a id="footerLink" role="modal-remote" href="/update">Edit</a>
            <a id="footerNest" role="modal-remote" data-modal-nest href="/z">forced nest</a>
          </div>
        </div></div>
      </div>`;
  });

  it('nests a link in the modal body (a detour you return from)', () => {
    expect(ModalStack.classifyIntent(document.getElementById('bodyLink'))).toBe('nest');
  });

  it('steps a link in the modal footer (the modal is done)', () => {
    expect(ModalStack.classifyIntent(document.getElementById('footerLink'))).toBe('step');
  });

  it('steps a host-page link: there is nothing to nest onto', () => {
    expect(ModalStack.classifyIntent(document.getElementById('host'))).toBe('step');
  });

  it('honours data-modal-step over the body default', () => {
    expect(ModalStack.classifyIntent(document.getElementById('bodyStep'))).toBe('step');
  });

  it('honours data-modal-nest over the footer default', () => {
    expect(ModalStack.classifyIntent(document.getElementById('footerNest'))).toBe('nest');
  });
});

describe('ModalStack level mapping', () => {
  let ModalStack, stack;
  beforeEach(() => {
    ModalStack = loadModalStack();
    document.body.innerHTML = `
      <a id="host" role="modal-remote" href="/x">host</a>
      <div class="modal" id="L0"><div class="modal-content">
        <div class="modal-body"><a id="b0" href="/a">body L0</a></div>
        <div class="modal-footer"><a id="f0" href="/b">footer L0</a></div>
      </div></div>
      <div class="modal" id="L1"><div class="modal-content">
        <div class="modal-body"><a id="b1" href="/c">body L1</a></div>
      </div></div>`;
    stack = new ModalStack('#L0');
    stack.levels = [{ $el: jQuery('#L0') }, { $el: jQuery('#L1') }];
  });

  it('reports -1 for a host-page element', () => {
    expect(stack.levelOf(document.getElementById('host'))).toBe(-1);
  });

  it('reports the level of the modal an element sits in', () => {
    expect(stack.levelOf(document.getElementById('b0'))).toBe(0);
    expect(stack.levelOf(document.getElementById('b1'))).toBe(1);
  });

  it('drives level 0 from the host page', () => {
    expect(stack.targetLevelFor(document.getElementById('host'))).toBe(0);
  });

  it('nests a body link one level above its own modal', () => {
    expect(stack.targetLevelFor(document.getElementById('b0'))).toBe(1);
    expect(stack.targetLevelFor(document.getElementById('b1'))).toBe(2);
  });

  it('steps a footer link at its own level', () => {
    expect(stack.targetLevelFor(document.getElementById('f0'))).toBe(0);
  });
});

describe('ModalStack container lifecycle', () => {
  let ModalStack;
  beforeEach(() => {
    ModalStack = loadModalStack();
    document.body.innerHTML = '<div class="modal" id="ajaxCrudModal"><div class="modal-content">' +
      '<div class="modal-header"></div><div class="modal-body"></div><div class="modal-footer"></div>' +
      '</div></div>';
  });

  it('builds a container with the regions ModalRemote caches', () => {
    document.body.insertAdjacentHTML('beforeend', ModalStack.containerHtml(2));
    const el = document.getElementById('ajaxCrudModal-L2');
    expect(el).not.toBeNull();
    expect(el.querySelector('.modal-dialog')).not.toBeNull();
    expect(el.querySelector('.modal-header')).not.toBeNull();
    expect(el.querySelector('.modal-body')).not.toBeNull();
    expect(el.querySelector('.modal-footer')).not.toBeNull();
  });

  it('gives each created container its level z-index', () => {
    const stack = new ModalStack('#ajaxCrudModal');
    stack.ensureLevel(1);
    expect(jQuery('#ajaxCrudModal-L1').css('z-index')).toBe(String(ModalStack.modalZIndex(1)));
  });

  it('appends created containers to body, not inside another modal', () => {
    const stack = new ModalStack('#ajaxCrudModal');
    stack.ensureLevel(1);
    expect(document.getElementById('ajaxCrudModal-L1').parentElement).toBe(document.body);
  });

  it('reuses the layout container for level 0 rather than creating one', () => {
    const stack = new ModalStack('#ajaxCrudModal');
    stack.ensureLevel(0);
    expect(stack.levels[0].$el[0]).toBe(document.getElementById('ajaxCrudModal'));
    expect(document.getElementById('ajaxCrudModal-L0')).toBeNull();
  });

  it('creates level 0 when the layout has no container', () => {
    document.body.innerHTML = '';
    const stack = new ModalStack('#ajaxCrudModal');
    stack.ensureLevel(0);
    expect(document.getElementById('ajaxCrudModal-L0')).not.toBeNull();
  });

  it('fills intermediate levels so the array stays dense', () => {
    const stack = new ModalStack('#ajaxCrudModal');
    stack.ensureLevel(2);
    expect(stack.levels.length).toBe(3);
  });

  it('truncateAbove destroys deeper levels and removes their DOM', () => {
    const stack = new ModalStack('#ajaxCrudModal');
    stack.ensureLevel(2);
    stack.truncateAbove(0);
    expect(stack.levels.length).toBe(1);
    expect(document.getElementById('ajaxCrudModal-L1')).toBeNull();
    expect(document.getElementById('ajaxCrudModal-L2')).toBeNull();
  });

  it('truncateAbove never destroys the layout-owned level 0 element', () => {
    const stack = new ModalStack('#ajaxCrudModal');
    stack.ensureLevel(1);
    stack.truncateAbove(-1);
    expect(stack.levels.length).toBe(0);
    expect(document.getElementById('ajaxCrudModal')).not.toBeNull();
  });
});

describe('ModalStack Bootstrap workarounds', () => {
  let ModalStack;
  beforeEach(() => {
    ModalStack = loadModalStack();
    document.body.innerHTML = '';
  });

  it('tags and z-indexes the backdrop Bootstrap just created', () => {
    document.body.insertAdjacentHTML('beforeend', '<div class="modal-backdrop"></div>');
    ModalStack.claimBackdrop(1);
    const bd = document.querySelector('.modal-backdrop');
    expect(bd.getAttribute('data-modal-level')).toBe('1');
    expect(bd.style.zIndex).toBe(String(ModalStack.backdropZIndex(1)));
  });

  it('never re-claims a backdrop already owned by another level', () => {
    document.body.insertAdjacentHTML('beforeend',
      '<div class="modal-backdrop" data-modal-level="0" style="z-index:1050"></div>');
    ModalStack.claimBackdrop(1);
    const bd = document.querySelector('.modal-backdrop');
    expect(bd.getAttribute('data-modal-level')).toBe('0');
  });

  it('claims only the newest backdrop when several are open', () => {
    document.body.insertAdjacentHTML('beforeend',
      '<div class="modal-backdrop" data-modal-level="0"></div><div class="modal-backdrop"></div>');
    ModalStack.claimBackdrop(1);
    const all = document.querySelectorAll('.modal-backdrop');
    expect(all[0].getAttribute('data-modal-level')).toBe('0');
    expect(all[1].getAttribute('data-modal-level')).toBe('1');
  });

  it('resets _isActive before re-activating, or activate() early-returns forever', () => {
    const calls = [];
    const trap = { _isActive: true, activate() { calls.push(this._isActive); } };
    ModalStack.restoreFocusTrap(document.createElement('div'), () => ({ _focustrap: trap }));
    expect(calls).toEqual([false]);
  });

  it('is a no-op when the element has no Bootstrap instance', () => {
    expect(() => ModalStack.restoreFocusTrap(document.createElement('div'), () => null)).not.toThrow();
  });
});
