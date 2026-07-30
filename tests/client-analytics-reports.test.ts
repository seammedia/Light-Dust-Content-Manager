import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildClientAnalyticsEmail,
  buildReportFromSnapshots,
  isDueInMelbourne,
  normaliseZernioMetrics,
  reportingPeriods,
} from '../server/clientAnalyticsReports.ts';

test('builds rolling and comparison periods from the previous completed day', () => {
  assert.deepEqual(reportingPeriods({
    now: new Date('2026-07-29T23:00:00.000Z'),
    timezone: 'Australia/Melbourne',
  }), {
    periodStart: '2026-06-30',
    periodEnd: '2026-07-29',
    previousPeriodStart: '2026-05-31',
    previousPeriodEnd: '2026-06-29',
    lookbackDays: 30,
  });
});

test('uses only the latest snapshot per post and exposes only returned metrics', () => {
  const report = buildReportFromSnapshots({
    clientId: 'client-1',
    clientName: 'Example Client',
    recipientName: 'Alex',
    periodEnd: '2026-07-27',
  }, [
    {
      post_id: 'post-1',
      platform: 'instagram',
      captured_on: '2026-07-20',
      published_at: '2026-07-10T08:00:00.000Z',
      impressions: 100,
      reach: 80,
      likes: 10,
      comments: 0,
      shares: 0,
      saves: 0,
      clicks: 0,
      views: 0,
      raw_metrics: { impressions: 100, reach: 80, likes: 10 },
    },
    {
      post_id: 'post-1',
      platform: 'instagram',
      captured_on: '2026-07-27',
      published_at: '2026-07-10T08:00:00.000Z',
      impressions: 140,
      reach: 100,
      likes: 14,
      comments: 0,
      shares: 0,
      saves: 0,
      clicks: 0,
      views: 0,
      raw_metrics: { impressions: 140, reach: 100, likes: 14 },
    },
  ], [
    {
      post_id: 'post-0',
      platform: 'instagram',
      captured_on: '2026-06-27',
      published_at: '2026-06-10T08:00:00.000Z',
      impressions: 100,
      reach: 80,
      likes: 10,
      comments: 0,
      shares: 0,
      saves: 0,
      clicks: 0,
      views: 0,
      raw_metrics: { impressions: 100, reach: 80, likes: 10 },
    },
  ]);

  assert.equal(report.platforms[0].posts, 1);
  assert.deepEqual(report.platforms[0].metrics.map((metric) => metric.key), ['impressions', 'reach', 'likes']);
  assert.equal(report.platforms[0].metrics[0].value, 140);
  assert.equal(report.platforms[0].metrics[0].changePercent, 40);
});

test('email follows the copy format and contains no em dash', () => {
  const report = buildReportFromSnapshots({
    clientId: 'client-1',
    clientName: 'Example Client',
    recipientName: 'Alex',
    periodEnd: '2026-07-27',
  }, [], []);
  const email = buildClientAnalyticsEmail(report);
  assert.match(email.text, /^Hi Alex,\n\n/);
  assert.match(email.text, /\n\nThanks,\nHeath\nSeam Media$/);
  const emDash = String.fromCodePoint(0x2014);
  assert.equal(email.text.includes(emDash), false);
  assert.equal(email.html.includes(emDash), false);
});

test('recognises the configured Monday morning window in Melbourne', () => {
  assert.equal(isDueInMelbourne(new Date('2026-08-02T23:30:00.000Z'), 1, '09:00'), true);
  assert.equal(isDueInMelbourne(new Date('2026-08-03T00:30:00.000Z'), 1, '09:00'), false);
});

test('normalises supported Zernio metric aliases without inventing missing values', () => {
  assert.deepEqual(normaliseZernioMetrics({
    impressions: '1200',
    reach: 900,
    likeCount: 42,
    comment_count: 7,
    shareCount: 5,
    saved: 11,
    linkClicks: 19,
    video_views: 340,
  }), {
    impressions: 1200,
    reach: 900,
    likes: 42,
    comments: 7,
    shares: 5,
    saves: 11,
    clicks: 19,
    views: 340,
  });
  assert.equal(normaliseZernioMetrics({ likes: 3 }).reach, 0);
});

test('the production email contains no em dash characters', () => {
  const report = buildReportFromSnapshots({
    clientId: 'micro-demo',
    clientName: 'Micro Demo',
    recipientName: 'Joe',
    periodEnd: '2026-07-29',
  }, [{
    post_id: 'post-1',
    platform: 'instagram',
    captured_on: '2026-07-29',
    published_at: '2026-07-27T08:00:00.000Z',
    impressions: 510,
    reach: 207,
    likes: 19,
    comments: 0,
    shares: 0,
    saves: 0,
    clicks: 0,
    views: 510,
    raw_metrics: { impressions: 510, reach: 207, likes: 19, views: 510 },
  }], []);
  const email = buildClientAnalyticsEmail(report);
  assert.equal(email.text.includes('—'), false);
  assert.equal(email.html.includes('—'), false);
});
