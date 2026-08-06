import assert from 'node:assert/strict';
import test from 'node:test';
import { reconcileExistingScheduledPost } from '../api/late-schedule.ts';

type ReconcileClient = Parameters<typeof reconcileExistingScheduledPost>[0];

test('persists Posted for a post that already has a Zernio ID', async () => {
  const calls: Array<[string, ...unknown[]]> = [];
  const query = {
    eq(column: string, value: string) {
      calls.push(['eq', column, value]);
      return query;
    },
    async select(columns: string) {
      calls.push(['select', columns]);
      return { data: [{ id: 'post-1' }], error: null };
    },
  };
  const client = {
    from(table: string) {
      calls.push(['from', table]);
      return {
        update(values: Record<string, unknown>) {
          calls.push(['update', values]);
          return query;
        },
      };
    },
  } as unknown as ReconcileClient;

  const result = await reconcileExistingScheduledPost(client, 'post-1', 'zernio-1');

  assert.equal(result.reconciled, true);
  assert.equal(result.error, null);
  assert.deepEqual(calls, [
    ['from', 'posts'],
    ['update', { status: 'Posted' }],
    ['eq', 'id', 'post-1'],
    ['eq', 'late_post_id', 'zernio-1'],
    ['select', 'id'],
  ]);
});

test('reports failure when the scheduled row cannot be reconciled', async () => {
  const query = {
    eq() {
      return query;
    },
    async select() {
      return { data: [], error: null };
    },
  };
  const client = {
    from() {
      return {
        update() {
          return query;
        },
      };
    },
  } as unknown as ReconcileClient;

  const result = await reconcileExistingScheduledPost(client, 'post-1', 'zernio-1');

  assert.equal(result.reconciled, false);
});
