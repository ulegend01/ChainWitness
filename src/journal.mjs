import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {dirname} from 'node:path';
import {usdAtomic} from './core.mjs';
export class Journal{
 constructor(file){this.file=file;this.records=[]}
 async open(){try{this.records=JSON.parse(await readFile(this.file,'utf8'));if(!Array.isArray(this.records))throw Error('Corrupt spend journal')}catch(e){if(e.code!=='ENOENT')throw e;this.records=[]}}
 async save(){await mkdir(dirname(this.file),{recursive:true});await writeFile(this.file+'.tmp',JSON.stringify(this.records,null,2));await rename(this.file+'.tmp',this.file)}
 rollingSpent(){const after=Date.now()-86400000;return this.records.filter(x=>x.at>after&&x.state!=='failed_before_send').reduce((v,x)=>v+BigInt(x.amount),0n)}
 async reserve(id,amount,daily){if(this.records.some(x=>x.id===id))throw Error('Duplicate attempt blocked. Check previous transfer before retrying.');if(this.rollingSpent()+amount>usdAtomic(daily))throw Error('Daily cap exceeded');this.records.push({id,at:Date.now(),amount:String(amount),state:'pending'});await this.save()}
 async update(id,properties){const x=this.records.find(x=>x.id===id);if(!x)throw Error('Journal record missing');Object.assign(x,properties);await this.save()}
}
