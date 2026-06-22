import { describe, expect, it } from 'vitest';
import { TABLE, docClient } from './dynamo.js';

describe('dynamo', () => {
  it('exports a docClient', () => {
    expect(docClient).toBeDefined();
    expect(typeof docClient.send).toBe('function');
  });

  it('exports TABLE defaulting to PeakHQ-prod', () => {
    expect(TABLE).toBe('PeakHQ-prod');
  });
});
