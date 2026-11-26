import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Guards the i18n layer: every copy object goes through defineMessages and no screen pins the
// locale by hand.

const SRC = path.resolve(import.meta.dirname, '..');
const COPY_OBJECT = /^(?:export )?const \w*(?:Copy|Label|Labels|Preview)(?:: [^=]+)? = \{$/m;
const PINNED_LOCALE = "'pt-BR'";
const I18N_DIR = 'i18n';

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return name === I18N_DIR ? [] : sources(full);
    return /\.tsx?$/.test(name) && !name.endsWith('.test.ts') ? [full] : [];
  });
}

describe('i18n resources', () => {
  const files = sources(SRC);

  it('has no copy object outside defineMessages', () => {
    const plain = files.filter((file) => COPY_OBJECT.test(readFileSync(file, 'utf8')));
    expect(plain.map((file) => path.relative(SRC, file))).toEqual([]);
  });

  it('never pins the locale outside the i18n layer', () => {
    const pinned = files.filter((file) => readFileSync(file, 'utf8').includes(PINNED_LOCALE));
    expect(pinned.map((file) => path.relative(SRC, file))).toEqual([]);
  });
});
