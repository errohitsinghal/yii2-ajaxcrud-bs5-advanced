import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import jqueryFactory from 'jquery';

function loadModalRemote() {
  const src = readFileSync('src/assets/ModalRemoteWithPassword.js', 'utf8');
  // See modal-remote-toasts.test.js for why the explicit `return`.
  // eslint-disable-next-line no-new-func
  const factory = new Function('window', 'jQuery', src + '\nreturn ModalRemote;');
  return factory(globalThis.window, globalThis.jQuery);
}

beforeEach(() => {
  // See modal-stack.test.js for why this must be a direct assignment, not a
  // factory call, under jQuery's ESM node wrapper.
  globalThis.jQuery = globalThis.$ = jqueryFactory;
});

/**
 * Drive successRemoteResponse (closure-private) the way production does: stub
 * $.ajax to fire `success` synchronously and call instance.doRemote(). The
 * bootstrap modal plugin and $.pjax do not exist under jsdom, so both are
 * stubbed; pjaxReload is the observable this suite asserts on.
 */
function setup(ModalRemote, response) {
  document.body.innerHTML = `
    <div id="grid-pjax"></div>
    <div class="modal" id="m0">
      <div class="modal-dialog"><div class="modal-content">
        <div class="modal-header"></div>
        <div class="modal-body"></div>
        <div class="modal-footer"></div>
      </div></div>
    </div>`;

  jQuery.fn.modal = function () { return this; };
  const pjaxReload = vi.fn();
  jQuery.pjax = { reload: pjaxReload };
  jQuery.ajax = (opts) => {
    if (opts.beforeSend) { opts.beforeSend(); }
    opts.success(response);
  };

  const instance = new ModalRemote('#m0');
  return { instance, pjaxReload };
}

describe('successRemoteResponse forceReload handling', () => {
  let ModalRemote;
  beforeEach(() => { ModalRemote = loadModalRemote(); });

  it('reloads the grid on forceClose+forceReload from a TOP-LEVEL modal (no stack)', () => {
    // The standard write response shape: every delete / settings action emits
    // forceClose+forceReload together. A top-level modal has no parent level
    // to refresh, so the reload itself must still run.
    const { instance, pjaxReload } = setup(ModalRemote, {
      forceClose: true,
      forceReload: '#grid-pjax',
    });

    instance.doRemote('/x', 'POST', {});

    expect(pjaxReload).toHaveBeenCalledTimes(1);
    expect(pjaxReload.mock.calls[0][0].container).toBe('#grid-pjax');
  });

  it('reloads the grid on forceClose+forceReload when the stack could not refresh a parent', () => {
    const { instance, pjaxReload } = setup(ModalRemote, {
      forceClose: true,
      forceReload: '#grid-pjax',
    });
    instance.modalLevel = 0;
    instance.modalStack = {
      refreshParentAfter: () => false, // level 0: no parent below
      resolveReloadTarget: (selector) => jQuery(selector).first(),
    };

    instance.doRemote('/x', 'POST', {});

    expect(pjaxReload).toHaveBeenCalledTimes(1);
    expect(pjaxReload.mock.calls[0][0].container).toBe('#grid-pjax');
  });

  it('suppresses forceReload when a parent refresh subsumed it (nested write)', () => {
    const { instance, pjaxReload } = setup(ModalRemote, {
      forceClose: true,
      forceReload: '#grid-pjax',
    });
    instance.modalLevel = 1;
    instance.modalStack = {
      refreshParentAfter: () => true, // parent modal re-fetched its content
      resolveReloadTarget: (selector) => jQuery(selector).first(),
    };

    instance.doRemote('/x', 'POST', {});

    expect(pjaxReload).not.toHaveBeenCalled();
  });

  it('still reloads on a bare forceReload response (modal-stays-open path)', () => {
    const { instance, pjaxReload } = setup(ModalRemote, {
      forceReload: '#grid-pjax',
      title: 'Saved',
      content: '<span class="text-success">success</span>',
    });

    instance.doRemote('/x', 'POST', {});

    expect(pjaxReload).toHaveBeenCalledTimes(1);
    expect(pjaxReload.mock.calls[0][0].container).toBe('#grid-pjax');
  });

  it('does not reload when the forceReload target does not exist in the DOM', () => {
    const { instance, pjaxReload } = setup(ModalRemote, {
      forceClose: true,
      forceReload: '#no-such-container',
    });

    instance.doRemote('/x', 'POST', {});

    expect(pjaxReload).not.toHaveBeenCalled();
  });
});
