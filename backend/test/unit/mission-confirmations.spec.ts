import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MissionsModule} from '../../src/missions/missions.module';

test('mission confirmation lookup is scoped to the authenticated nurse and requested mission',async()=>{
 const [Controller]=Reflect.getMetadata('controllers',MissionsModule);
 const calls:any[]=[];
 const controller=new Controller({}, {query:async(sql:string,params:string[])=>{calls.push({sql,params});return params[0]==='owner'&&params[1]==='mission'?[{id:'assignment',status:'ACTIVE'}]:[];}});
 const owner={session:{userId:'owner'}}, other={session:{userId:'other'}};
 assert.deepEqual(await controller.ownAssignments(owner,'mission'),[{id:'assignment',status:'ACTIVE'}]);
 assert.deepEqual(await controller.ownAssignments(other,'mission'),[]);
 assert.deepEqual(await controller.ownAssignments(owner,'another-mission'),[]);
 assert.match(calls[0].sql,/WHERE nurse_id=\$1 AND mission_id=\$2/);
 assert.deepEqual(calls.map(x=>x.params),[['owner','mission'],['other','mission'],['owner','another-mission']]);
 assert.throws(()=>controller.ownAssignments({session:{}},'mission'),{status:401});
});
