import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildClientAnalyticsEmail,
  buildReportFromSnapshots,
  isDueInMelbourne,
  MockAnalyticsProvider,
  normaliseZernioMetrics,
  reportingPeriods,
  summariseClientAnalyticsReport,
  ZernioAnalyticsProvider,
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
  assert.equal(report.dailyAttribution, 'published');
  assert.deepEqual(report.dailySeries, [{
    date: '2026-07-10',
    posts: 1,
    metrics: {
      impressions: 140,
      reach: 100,
      likes: 14,
      comments: 0,
      shares: 0,
      saves: 0,
      clicks: 0,
      views: 0,
    },
  }]);
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

test('email highlights growth in green and renders a 30-day comparison chart', () => {
  const report = buildReportFromSnapshots({
    clientId: 'client-1',
    clientName: 'Example Client',
    recipientName: 'Alex',
    periodEnd: '2026-07-27',
  }, [{
    post_id: 'post-current',
    platform: 'instagram',
    captured_on: '2026-07-27',
    published_at: '2026-07-10T08:00:00.000Z',
    impressions: 150,
    reach: 80,
    likes: 20,
    comments: 0,
    shares: 0,
    saves: 0,
    clicks: 0,
    views: 0,
    raw_metrics: { impressions: 150, reach: 80, likes: 20 },
  }], [{
    post_id: 'post-previous',
    platform: 'instagram',
    captured_on: '2026-06-27',
    published_at: '2026-06-10T08:00:00.000Z',
    impressions: 100,
    reach: 100,
    likes: 20,
    comments: 0,
    shares: 0,
    saves: 0,
    clicks: 0,
    views: 0,
    raw_metrics: { impressions: 100, reach: 100, likes: 20 },
  }]);
  const email = buildClientAnalyticsEmail(report);

  assert.match(email.html, /color:#15803d;font-weight:700;">\(50% up from the previous period\)/);
  assert.match(email.html, /color:#b91c1c;font-weight:700;">\(20% down from the previous period\)/);
  assert.match(email.html, /30-day comparison/);
  assert.match(email.html, /Current 30 days compared with the previous 30 days/);
  assert.match(email.html, /Previous 100/);
  assert.match(email.html, /Current 150/);
});

test('weekly email includes the richer analytics story in HTML and plain text', async () => {
  const report = await new MockAnalyticsProvider().getReport({
    clientId: 'client-preview',
    clientName: 'Preview Client',
    recipientName: 'Alex',
    periodEnd: '2026-08-08',
    includeDaily: true,
    includeTopPosts: true,
  });
  const email = buildClientAnalyticsEmail(report);

  assert.ok(report.dailySeries.length > 1);
  assert.equal(report.topPosts.length, 2);
  assert.match(email.html, /Daily performance trend/);
  assert.match(email.html, /Channel contribution/);
  assert.match(email.html, /How people responded/);
  assert.match(email.html, /Top-performing content/);
  assert.match(email.html, /Review your analytics/);
  assert.match(email.html, /https:\/\/seam-media-content-manager\.vercel\.app\//);
  assert.doesNotMatch(email.html, /<(?:canvas|script|svg)\b/i);
  assert.match(email.text, /Daily performance trend:/);
  assert.match(email.text, /Channel contribution:/);
  assert.match(email.text, /How people responded:/);
  assert.match(email.text, /Top-performing content:/);
  assert.match(email.text, /Full analytics dashboard:/);
});

test('live weekly report requests received-attribution daily data and top posts', async () => {
  const originalFetch = globalThis.fetch;
  const calls: URL[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    calls.push(url);
    const isTopPosts = url.pathname.endsWith('/analytics');
    const payload = isTopPosts ? {
      posts: [{
        postId: 'post-1',
        content: 'A strong client result.',
        publishedAt: '2026-08-05T08:00:00.000Z',
        platform: 'instagram',
        analytics: { reach: 900, likes: 60, comments: 8, shares: 12, saves: 20 },
      }],
    } : {
      dailyData: [{ date: '2026-08-05', postCount: 1, metrics: { reach: 900, likes: 60 } }],
      platformBreakdown: [{ platform: 'instagram', postCount: 1, reach: 900, likes: 60 }],
    };
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const report = await new ZernioAnalyticsProvider('profile-1', 'test-api-key').getReport({
      clientId: 'client-live',
      clientName: 'Live Client',
      periodEnd: '2026-08-08',
      includeDaily: true,
      includeTopPosts: true,
    });
    assert.equal(report.dailyAttribution, 'received');
    assert.equal(report.dailySeries[0].metrics.reach, 900);
    assert.equal(report.topPosts[0].metrics.engagements, 100);
    assert.ok(calls.some((url) => url.pathname.endsWith('/analytics/daily-metrics') && url.searchParams.get('attribution') === 'received'));
    assert.ok(calls.some((url) => url.pathname.endsWith('/analytics') && url.searchParams.get('sortBy') === 'engagement'));
  } finally {
    globalThis.fetch = originalFetch;
  }
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

test('summarises a live 30-day report for the client analytics screen', () => {
  const report = buildReportFromSnapshots({
    clientId: 'client-live',
    clientName: 'Live Client',
    recipientName: 'Alex',
    periodEnd: '2026-08-04',
  }, [{
    post_id: 'post-live',
    platform: 'instagram',
    captured_on: '2026-08-04',
    published_at: '2026-07-20T08:00:00.000Z',
    impressions: 200,
    reach: 120,
    likes: 15,
    comments: 2,
    shares: 3,
    saves: 4,
    clicks: 5,
    views: 180,
    raw_metrics: { impressions: 200, reach: 120, likes: 15, comments: 2, shares: 3, saves: 4, clicks: 5, views: 180 },
  }], []);
  const summary = summariseClientAnalyticsReport(report);
  assert.equal(summary.sampledPosts, 1);
  assert.equal(summary.periodStart, '2026-07-06');
  assert.equal(summary.metrics.find((metric) => metric.key === 'reach')?.value, 120);
  assert.equal(summary.metrics.find((metric) => metric.key === 'engagements')?.value, 24);
  assert.equal(summary.platforms[0].platform, 'instagram');
  assert.equal(summary.dailySeries[0].date, '2026-07-20');
  assert.equal(summary.dailySeries[0].metrics.views, 180);
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
