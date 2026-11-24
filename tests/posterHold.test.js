import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POSTER_MIN_MS, holdRemaining } from '../src/utils/posterHold.js';

test('a fast load keeps the poster up for the rest of the minimum', () => {
    assert.equal(holdRemaining(1000, 1300), POSTER_MIN_MS - 300);
    assert.equal(holdRemaining(1000, 1000), POSTER_MIN_MS);
});

test('a slow load is never made longer', () => {
    assert.equal(holdRemaining(1000, 1000 + POSTER_MIN_MS), 0);
    assert.equal(holdRemaining(1000, 1000 + POSTER_MIN_MS + 7000), 0);
});

test('nothing to hold when the poster never appeared', () => {
    assert.equal(holdRemaining(null, 5000), 0);
    assert.equal(holdRemaining(undefined, 5000), 0);
});

test('the minimum can be overridden', () => {
    assert.equal(holdRemaining(0, 1000, 3000), 2000);
});
