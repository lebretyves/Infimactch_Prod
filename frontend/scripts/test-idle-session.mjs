import {test} from 'node:test';import assert from 'node:assert/strict';
import {idlePhase,IDLE_TIMEOUT_MS} from '../src/lib/idleSession.ts';
test('warning at minute 14, logout at minute 15',()=>{assert.equal(idlePhase(IDLE_TIMEOUT_MS,13*60*1000),'active');assert.equal(idlePhase(IDLE_TIMEOUT_MS,14*60*1000),'warning');assert.equal(idlePhase(IDLE_TIMEOUT_MS,15*60*1000),'expired');});
test('sleeping tab cannot extend an expired deadline',()=>{assert.equal(idlePhase(IDLE_TIMEOUT_MS,60*60*1000),'expired');});
