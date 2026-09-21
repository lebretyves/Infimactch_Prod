import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dispatchHealth,DISPATCH_HEALTH_MAX_AGE_MS} from '../../src/automation/dispatch-health';

test('cloud dispatch remains fresh across the four-hour schedule and expires after its grace period',()=>{
 const now=Date.parse('2026-09-21T12:00:00Z');
 assert.equal(dispatchHealth(new Date(now-4*60*60*1000),now),'ready');
 assert.equal(dispatchHealth(new Date(now-DISPATCH_HEALTH_MAX_AGE_MS).toISOString(),now),'ready');
 assert.equal(dispatchHealth(new Date(now-DISPATCH_HEALTH_MAX_AGE_MS-1),now),'unknown');
 for(const value of [undefined,null,'invalid',new Date(NaN),new Date(now+1)])assert.equal(dispatchHealth(value,now),'unknown');
});
