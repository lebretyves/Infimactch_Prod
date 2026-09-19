import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {conversionRate,validateConversionPeriod} from '../../src/listings/conversions';
test('zero denominator is unavailable and known denominators use two decimal percentages',()=>{
 assert.deepEqual(conversionRate(0,0),{numerator:0,denominator:0,percent:null});assert.equal(conversionRate(1,3).percent,33.33);assert.equal(conversionRate(2,4).percent,50);
});
test('period validates actual calendar dates and bounds before querying SQL',()=>{
 const now=Date.parse('2026-09-19T14:00:00Z');
 for(const [from,to] of [['2026-02-30','2026-03-01'],['2026-03-01','2026-02-01'],['1999-12-31','2000-01-01'],['2025-01-01','2026-09-19'],['2026-09-19','2026-09-20'],['2026-09-19T00:00:00Z','2026-09-19']])assert.throws(()=>validateConversionPeriod(from!,to!,now));
 validateConversionPeriod('2024-02-29','2024-02-29',now);validateConversionPeriod('2025-09-19','2026-09-19',now);
});
