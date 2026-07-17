import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import jqueryFactory from 'jquery';

function loadModalRemote() {
  const src = readFileSync('src/assets/ModalRemoteWithPassword.js', 'utf8');
  // ModalRemoteWithPassword.js declares `function ModalRemote(...) {}` as a
  // bare top-level statement (not wrapped in an IIFE like ModalStack.js), so
  // in a real <script> tag it lands on `window` for free. Executed through
  // `new Function`, that top-level declaration is merely local to the
  // function body -- so grab it via an explicit `return` instead of relying
  // on `window.ModalRemote`, which nothing in the source sets.
  // eslint-disable-next-line no-new-func
  const factory = new Function('window', 'jQuery', src + '\nreturn ModalRemote;');
  return factory(globalThis.window, globalThis.jQuery);
}

beforeEach(() => {
  // See modal-stack.test.js for why this must be a direct assignment, not a
  // factory call, under jQuery's ESM node wrapper.
  globalThis.jQuery = globalThis.$ = jqueryFactory;
});

describe('ModalRemote.classifyContent', () => {
  let ModalRemote;
  beforeEach(() => { ModalRemote = loadModalRemote(); });

  it('classifies .is-invalid as danger', () => {
    const html = '<form><input class="is-invalid"><div class="invalid-feedback">Required</div></form>';
    expect(ModalRemote.classifyContent(html)).toBe('danger');
  });

  it('classifies .has-error as danger', () => {
    const html = '<form><div class="form-group has-error"><input></div></form>';
    expect(ModalRemote.classifyContent(html)).toBe('danger');
  });

  it('classifies .alert-danger as danger', () => {
    const html = '<div class="alert alert-danger">Something went wrong</div>';
    expect(ModalRemote.classifyContent(html)).toBe('danger');
  });

  it('classifies .alert-success as success', () => {
    const html = '<div class="alert alert-success">Saved</div>';
    expect(ModalRemote.classifyContent(html)).toBe('success');
  });

  it('gives no toast for a bare form with no markers -- outcome unknowable', () => {
    const html = '<form><input name="title" value="x"></form>';
    expect(ModalRemote.classifyContent(html)).toBeNull();
  });

  it('classifies as success when there is no form and no markers (a view re-render)', () => {
    const html = '<div class="panel"><h4>Person</h4><p>Jane Doe</p></div>';
    expect(ModalRemote.classifyContent(html)).toBe('success');
  });

  it('does NOT false-positive on "is-invalid" embedded as a substring in yiiActiveForm JSON config', () => {
    // This is the whole reason DOMParser (not String#indexOf) drives the
    // classifier: yii's ActiveForm widget always emits a JS config blob
    // naming its own error classes literally, even when the form is clean.
    const html =
      '<form id="w0" class="was-validated">' +
      '  <input name="title" value="x">' +
      '  <script>jQuery("#w0").yiiActiveForm([{"id":"title","errorCssClass":"is-invalid",' +
      '"validate":function(attribute,value,messages,deferred,$form){}}],' +
      '{"validateOnSubmit":true,"validationStateOn":"container"});</script>' +
      '</form>';

    // Sanity: the substring really is in there (this is what would fool a
    // naive classifier).
    expect(html.includes('is-invalid')).toBe(true);

    // But no element in the rendered DOM actually carries that class, so
    // the classifier must not call it danger. It is a bare form with no
    // rendered markers -- outcome unknowable, so no toast.
    expect(ModalRemote.classifyContent(html)).toBeNull();
  });
});

describe('ModalRemote.inferToast', () => {
  let ModalRemote;
  beforeEach(() => { ModalRemote = loadModalRemote(); });

  it('never toasts a GET response, even one with content', () => {
    const response = { title: 'Edit', content: '<div class="alert alert-success">Saved</div>' };
    expect(ModalRemote.inferToast(response, 'GET')).toBeNull();
  });

  it('defaults to GET (no toast) when method is omitted', () => {
    const response = { title: 'Edit', content: '<div class="alert alert-success">Saved</div>' };
    expect(ModalRemote.inferToast(response)).toBeNull();
  });

  it('toasts "Action completed" on forceClose regardless of method', () => {
    expect(ModalRemote.inferToast({ forceClose: true }, 'POST')).toEqual({
      type: 'success',
      message: 'Action completed',
    });
  });

  it('toasts danger for a POST response classified as danger', () => {
    const response = { title: 'Edit', content: '<form><input class="is-invalid"></form>' };
    expect(ModalRemote.inferToast(response, 'POST')).toEqual({
      type: 'danger',
      message: 'Please fix the highlighted errors',
    });
  });

  it('toasts success for a POST response classified as success', () => {
    const response = { title: 'Edit', content: '<div class="alert alert-success">Saved</div>' };
    expect(ModalRemote.inferToast(response, 'POST')).toEqual({
      type: 'success',
      message: 'Saved successfully',
    });
  });

  it('gives no toast for a POST response whose form has no markers', () => {
    const response = { title: 'Edit', content: '<form><input name="title"></form>' };
    expect(ModalRemote.inferToast(response, 'POST')).toBeNull();
  });

  it('gives no toast when content is missing (e.g. a bare forceReload response)', () => {
    expect(ModalRemote.inferToast({ forceReload: '#crud-datatable-pjax' }, 'POST')).toBeNull();
  });
});

describe('ModalRemote.decideToasts', () => {
  let ModalRemote;
  beforeEach(() => { ModalRemote = loadModalRemote(); });

  it('renders explicit response.toasts verbatim and infers nothing else', () => {
    const response = {
      toasts: [{ type: 'success', message: 'Reference IDs updated' }],
      forceClose: true, // would ALSO infer 'Action completed' if not short-circuited
    };
    expect(ModalRemote.decideToasts(response, 'POST')).toEqual([
      { type: 'success', message: 'Reference IDs updated' },
    ]);
  });

  it('renders every explicit toast in a multi-toast response', () => {
    const response = {
      toasts: [
        { type: 'success', message: 'Saved' },
        { type: 'warning', message: 'Also check X' },
      ],
    };
    expect(ModalRemote.decideToasts(response, 'POST')).toEqual([
      { type: 'success', message: 'Saved' },
      { type: 'warning', message: 'Also check X' },
    ]);
  });

  it('falls back to inference when response.toasts is absent', () => {
    const response = { forceClose: true };
    expect(ModalRemote.decideToasts(response, 'POST')).toEqual([
      { type: 'success', message: 'Action completed' },
    ]);
  });

  it('falls back to inference when response.toasts is an empty array', () => {
    const response = { toasts: [], forceClose: true };
    expect(ModalRemote.decideToasts(response, 'POST')).toEqual([
      { type: 'success', message: 'Action completed' },
    ]);
  });

  it('renders nothing for a GET response with no explicit toasts', () => {
    const response = { title: 'Edit', content: '<form></form>' };
    expect(ModalRemote.decideToasts(response, 'GET')).toEqual([]);
  });
});

describe('ModalRemote.showToast', () => {
  let ModalRemote;
  beforeEach(() => {
    document.body.innerHTML = '';
    ModalRemote = loadModalRemote();
  });

  it('creates the shared #toast-container on first use', () => {
    ModalRemote.showToast('Saved successfully', 'success');
    const container = document.getElementById('toast-container');
    expect(container).not.toBeNull();
    expect(container.querySelectorAll('.toast').length).toBe(1);
  });

  it('reuses the existing container for a second toast', () => {
    ModalRemote.showToast('First', 'success');
    ModalRemote.showToast('Second', 'danger');
    expect(document.querySelectorAll('#toast-container').length).toBe(1);
    expect(document.querySelectorAll('.toast').length).toBe(2);
  });

  it('writes the message via textContent, never HTML injection', () => {
    ModalRemote.showToast('<img src=x onerror=alert(1)>', 'danger');
    const body = document.querySelector('.toast-body');
    expect(body.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(body.querySelector('img')).toBeNull();
  });

  it('maps danger to the bg-danger/text-white classes', () => {
    ModalRemote.showToast('Oops', 'danger');
    const toast = document.querySelector('.toast');
    expect(toast.className).toContain('bg-danger');
    expect(toast.className).toContain('text-white');
  });

  it('maps warning to bg-warning/text-dark', () => {
    ModalRemote.showToast('Careful', 'warning');
    const toast = document.querySelector('.toast');
    expect(toast.className).toContain('bg-warning');
    expect(toast.className).toContain('text-dark');
  });

  it('does not throw when window.bootstrap is absent (feature-detected)', () => {
    expect(() => ModalRemote.showToast('Saved', 'success')).not.toThrow();
  });
});
