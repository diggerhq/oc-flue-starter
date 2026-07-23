import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseDuration } from '../src/utils/parse-duration.js';

describe('parseDuration', () => {
  describe('milliseconds support', () => {
    it('parses milliseconds: 250ms should return 250', () => {
      assert.equal(parseDuration('250ms'), 250);
    });

    it('parses single digit milliseconds', () => {
      assert.equal(parseDuration('1ms'), 1);
    });

    it('parses large millisecond values', () => {
      assert.equal(parseDuration('5000ms'), 5000);
    });
  });

  describe('combined values', () => {
    it('parses combined 1s250ms should return 1250', () => {
      assert.equal(parseDuration('1s250ms'), 1250);
    });

    it('parses multiple units in sequence', () => {
      assert.equal(parseDuration('1h30m45s500ms'), 1 * 60 * 60 * 1000 + 30 * 60 * 1000 + 45 * 1000 + 500);
    });

    it('parses 2s500ms', () => {
      assert.equal(parseDuration('2s500ms'), 2500);
    });

    it('parses 1m30s', () => {
      assert.equal(parseDuration('1m30s'), 90000);
    });
  });

  describe('single unit values', () => {
    it('parses seconds: 1s should return 1000', () => {
      assert.equal(parseDuration('1s'), 1000);
    });

    it('parses minutes: 1m should return 60000', () => {
      assert.equal(parseDuration('1m'), 60000);
    });

    it('parses hours: 1h should return 3600000', () => {
      assert.equal(parseDuration('1h'), 3600000);
    });

    it('parses 5s', () => {
      assert.equal(parseDuration('5s'), 5000);
    });

    it('parses 2m', () => {
      assert.equal(parseDuration('2m'), 120000);
    });
  });

  describe('edge cases', () => {
    it('handles whitespace', () => {
      assert.equal(parseDuration('  1s  '), 1000);
    });

    it('handles decimal values: 1.5s should return 1500', () => {
      assert.equal(parseDuration('1.5s'), 1500);
    });

    it('handles decimal milliseconds', () => {
      assert.equal(parseDuration('250.5ms'), 250.5);
    });

    it('handles complex decimal combination', () => {
      assert.equal(parseDuration('1.5s250.5ms'), 1750.5);
    });
  });

  describe('error cases', () => {
    it('throws on invalid format', () => {
      assert.throws(() => parseDuration('invalid'), /Invalid duration format/);
    });

    it('throws on empty string', () => {
      assert.throws(() => parseDuration(''), /Duration must be a non-empty string/);
    });

    it('throws on no units', () => {
      assert.throws(() => parseDuration('123'), /Invalid duration format/);
    });

    it('throws on invalid unit', () => {
      assert.throws(() => parseDuration('1sec'), /Invalid duration format/);
    });

    it('throws on partial parse', () => {
      assert.throws(() => parseDuration('1s 2s'), /Invalid duration format/);
    });
  });
});
