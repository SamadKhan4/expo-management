import test from 'node:test';
import assert from 'node:assert/strict';
import {createScanGuard} from '../src/services/scanGuard.js';
test('camera debounce allows new visitors and repeat scans after cooldown',()=>{let now=0;const guard=createScanGuard(2500,()=>now);assert.equal(guard.accept('pass-a'),true);assert.equal(guard.accept('pass-a'),false);assert.equal(guard.accept('pass-b'),true);now=2600;assert.equal(guard.accept('pass-b'),true);assert.equal(guard.accept('pass-b'),false);guard.reset();assert.equal(guard.accept('pass-b'),true);});
