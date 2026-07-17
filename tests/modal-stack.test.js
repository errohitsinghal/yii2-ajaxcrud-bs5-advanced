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
