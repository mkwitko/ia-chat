import { describe, expect, it } from 'vitest';
import { createFakeClock } from './clock.ts';
import { pacedDelayMs, targetDelayMs } from './pacing.ts';

describe('natural delivery pacing (spec 03, "Execução do turno")', () => {
  it('targets 1.5 s plus 40 characters per second, between 1.5 s and 8 s', () => {
    expect(targetDelayMs('')).toBe(1500);
    expect(targetDelayMs('a'.repeat(80))).toBe(3500);
    expect(targetDelayMs('a'.repeat(1000))).toBe(8000);
  });

  it('subtracts the processing time already spent, never below zero', () => {
    const text = 'a'.repeat(80); // 3.5 s target
    expect(pacedDelayMs(text, 1000)).toBe(2500);
    expect(pacedDelayMs(text, 5000)).toBe(0);
  });
});

describe('fake clock', () => {
  it('fires timers and sleeps only when time is advanced', async () => {
    const clock = createFakeClock();
    const fired: number[] = [];
    clock.after(20_000, () => fired.push(20));
    const cancel = clock.after(45_000, () => fired.push(45));
    let slept = false;
    void clock.sleep(1000).then(() => (slept = true));
    await clock.advance(999);
    expect([fired, slept]).toEqual([[], false]);
    await clock.advance(19_001);
    expect([fired, slept]).toEqual([[20], true]);
    cancel();
    await clock.advance(30_000);
    expect(fired).toEqual([20]);
    expect(clock.now()).toBe(50_000);
  });
});
