import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { batchDelete } from './batchDelete.js';

vi.mock('./dynamo.js', () => ({
  docClient: { send: vi.fn() },
  TABLE: 'test-table',
}));

import { docClient } from './dynamo.js';

describe('batchDelete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(docClient.send).mockResolvedValue({} as never);
  });

  it('does nothing for empty array', async () => {
    await batchDelete([]);
    expect(docClient.send).not.toHaveBeenCalled();
  });

  it('sends one batch for 1 item', async () => {
    await batchDelete([{ PK: 'A', SK: 'B' }]);
    expect(docClient.send).toHaveBeenCalledTimes(1);
    const cmd = vi.mocked(docClient.send).mock.calls[0][0] as BatchWriteCommand;
    expect(cmd.input.RequestItems?.['test-table']).toHaveLength(1);
  });

  it('sends one batch for exactly 25 items', async () => {
    const keys = Array.from({ length: 25 }, (_, i) => ({ PK: `A${i}`, SK: 'B' }));
    await batchDelete(keys);
    expect(docClient.send).toHaveBeenCalledTimes(1);
  });

  it('sends two batches for 26 items', async () => {
    const keys = Array.from({ length: 26 }, (_, i) => ({ PK: `A${i}`, SK: 'B' }));
    await batchDelete(keys);
    expect(docClient.send).toHaveBeenCalledTimes(2);
    const first = vi.mocked(docClient.send).mock.calls[0][0] as BatchWriteCommand;
    const second = vi.mocked(docClient.send).mock.calls[1][0] as BatchWriteCommand;
    expect(first.input.RequestItems?.['test-table']).toHaveLength(25);
    expect(second.input.RequestItems?.['test-table']).toHaveLength(1);
  });
});
