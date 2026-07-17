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
