import {test} from 'node:test';
import assert from 'node:assert/strict';
import {missionCrushs} from '../src/lib/missionCrushs.ts';
const item=(id,score)=>({id,title:id,matching_score:score});
const data=(internal=[],external=[])=>({internal:{status:'READY',items:internal},external:{status:'READY',items:external}});
test('three highest ranked partners retain API order and do not get displaced by incomparable external scores',()=>{
 const d=data([item('m_best',98),item('m_second',90),item('m_third',82),item('m_fourth',70)],[item('e_external',100)]);
 assert.deepEqual(missionCrushs(d,'toutes').map(c=>c.item.id),['m_best','m_second','m_third']);assert.equal(d.internal.items.length,4);
});
test('remaining places use externally ranked offers without inventing or changing their scores',()=>{
 const d=data([item('m_one',80)],[item('e_one',null),item('e_two',null),item('e_three',null)]);
 const r=missionCrushs(d,'toutes');assert.deepEqual(r.map(c=>[c.item.id,c.external]),[['m_one',false],['e_one',true],['e_two',true]]);assert.equal(r[1].item.matching_score,null);
});
test('source filters are respected and repeated IDs never pad the selection',()=>{
 const d=data([item('m_one',80),item('m_one',80)],[item('e_one',null)]);
 assert.deepEqual(missionCrushs(d,'partenaires').map(c=>c.item.id),['m_one']);assert.deepEqual(missionCrushs(d,'externes').map(c=>c.item.id),['e_one']);assert.equal(missionCrushs(d,'toutes').length,2);
});
test('unavailable partners do not claim compatibility and empty data creates no fictitious cards',()=>{
 const d=data([item('m_one',80)],[item('e_one',null)]);d.internal.status='UNAVAILABLE';assert.deepEqual(missionCrushs(d,'toutes').map(c=>c.item.id),['e_one']);assert.deepEqual(missionCrushs(data(),'toutes'),[]);
});
