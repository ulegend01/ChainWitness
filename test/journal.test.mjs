import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Journal} from '../src/journal.mjs';
test('journal caps aggregate spend and prevents retry',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'chainwitness-'));
 try{const j=new Journal(join(dir,'journal.json'));await j.open();await j.reserve('id:scout',10000n,'0.03');await j.reserve('id:sentinel',20000n,'0.03');await assert.rejects(j.reserve('id:another',1n,'0.03'),/cap/);await assert.rejects(j.reserve('id:scout',10000n,'0.1'),/Duplicate/);const x=new Journal(join(dir,'journal.json'));await x.open();assert.equal(x.records.length,2)}finally{await rm(dir,{recursive:true,force:true})}
});
