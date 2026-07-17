import { describe, it, expect } from 'vitest';

describe('harness', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });

  it('provides a jsdom document', () => {
    document.body.innerHTML = '<div class="modal"><div class="modal-body"><a id="x"></a></div></div>';
    expect(document.getElementById('x').closest('.modal')).not.toBeNull();
  });
});
