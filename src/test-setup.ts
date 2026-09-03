/**
 * test-setup — the DOM matchers, registered the way this workspace can take.
 *
 * 🪤 THIS WAS `@testing-library/jest-dom/vitest`, AND IT KILLED ALL 76 TESTS.
 * That entry point is written for vitest 2/3: it reaches into the expect state
 * and sets `testPath`, which is getter-only in the vitest 1.6 this workspace
 * pins. The failure lands during setup, so every file in the cartridge died
 * with `Cannot set property testPath of #<Object> which has only a getter` and
 * not one assertion ever ran. The suite had never been green on CI.
 *
 * The `/matchers` entry is the version-neutral one: it exports the matchers and
 * nothing else, and `expect.extend` is the same in every vitest. It is what
 * survives the next bump in either direction.
 */
import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);
