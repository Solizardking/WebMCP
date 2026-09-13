import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {createSolanaService,address,validateSwap,TOKENS} from '../apps/solana-browser/server/solana.mjs';
import {BrowserRun,allowedUrl} from '../apps/solana-browser/server/browser-run.mjs';
import {createApp} from '../apps/solana-browser/server/index.mjs';
import {registerWebMCPTools} from '../dist/webmcp/register.js';
const validSwap={inputMint:TOKENS[0].mint,outputMint:TOKENS[1].mint,amount:'0.1',swapMode:'ExactIn',slippageBps:50};
test('Solana boundary validates decoded addresses and decimal amounts',()=>{
 assert.equal(address(TOKENS[0].mint),TOKENS[0].mint);assert.throws(()=>address('1'.repeat(33)));assert.throws(()=>address('0'.repeat(32)));
 assert.deepEqual(validateSwap(validSwap),validSwap);
 for(const amount of ['0','-1','1e9',0.1,'NaN','1.1234567890'])assert.throws(()=>validateSwap({...validSwap,amount}));
 assert.throws(()=>validateSwap({...validSwap,outputMint:TOKENS[0].mint}));assert.throws(()=>validateSwap({...validSwap,slippageBps:501}));
});
test('live market selection excludes other chains, quote-side matches and illiquid pools',async()=>{
 const pairs=[{chainId:'ethereum',baseToken:{address:TOKENS[0].mint},liquidity:{usd:900}},{chainId:'solana',baseToken:{address:TOKENS[1].mint},liquidity:{usd:900}},{chainId:'solana',baseToken:{address:TOKENS[0].mint},pairAddress:'small',liquidity:{usd:10}},{chainId:'solana',baseToken:{address:TOKENS[0].mint},pairAddress:'large',liquidity:{usd:20}}];
 const service=createSolanaService({},async()=>Response.json(pairs));const result=await service.market(TOKENS[0].mint);assert.equal(result.pair.pairAddress,'large');assert.ok(result.observedAt);
});
test('RPC failures and unconfigured quotes fail visibly, with no broadcast method',async()=>{
 const service=createSolanaService({},async()=>Response.json({error:{message:'rate limited'}}));
 await assert.rejects(service.network('mainnet-beta'),/rate limited/);await assert.rejects(service.quote(validSwap),/JUPITER_API_KEY/);await assert.rejects(service.wallet('bad','devnet'),/base58/);
});
test('quote amount conversion preserves decimal precision',async()=>{
 let called;const service=createSolanaService({JUPITER_API_KEY:'fixture'},async(url)=>{called=new URL(url);return Response.json({inAmount:'100000001',outAmount:'1'});});
 await service.quote({...validSwap,amount:'0.100000001'});assert.equal(called.searchParams.get('amount'),'100000001');await assert.rejects(service.quote({...validSwap,network:'devnet'}),/mainnet/);
});
test('Cloudflare requires configuration and allowlisted HTTPS destinations',async()=>{
 const b=new BrowserRun({});await assert.rejects(b.start('https://solana.com/'),/not configured/);
 for(const url of ['http://solana.com','https://solana.com.evil.test','https://user:pass@solana.com/','https://127.0.0.1/','file:///etc/passwd'])assert.throws(()=>allowedUrl(url));
 assert.equal(allowedUrl('https://solana.com/docs'),'https://solana.com/docs');
});
test('Quick Actions keep credentials server-side and bound crawls; paginate and cancel',async()=>{
 const calls=[];const b=new BrowserRun({CLOUDFLARE_ACCOUNT_ID:'a'.repeat(32),CLOUDFLARE_API_TOKEN:'fixture'},async(url,init)=>{calls.push({url,init});return Response.json({success:true,result:init.method==='POST'?'job-1':{status:'completed',cursor:10}});});
 await b.quick('crawl',{url:'https://solana.com/docs',limit:1000});const request=JSON.parse(calls[0].init.body);assert.equal(request.limit,10);assert.equal(request.render,false);assert.deepEqual(request.crawlPurposes,['search']);assert.equal(request.contentUse,'reference');
 await b.crawl('job-1','GET',10);assert.match(calls[1].url,/cursor=10/);await b.crawl('job-1','DELETE');assert.equal(calls[2].init.method,'DELETE');await assert.rejects(b.crawl('someone-elses-job'),/Unknown/);
 assert.equal(JSON.stringify(b.status()).includes('fixture'),false);
});
class FakeCDP extends EventEmitter {
 constructor(){super();this.ready=Promise.resolve();this.calls=[];FakeCDP.last=this;}
 async send(method,params,sessionId){this.calls.push({method,params});
  if(method==='Target.createTarget')return {targetId:'target'};
  if(method==='Target.attachToTarget')return {sessionId:'page'};
  if(method==='Page.navigate'){setTimeout(()=>this.emit('Page.loadEventFired',{},sessionId),1);return {};}
  if(method==='Runtime.evaluate')return {result:{value:params.expression==='location.href'?'https://solana.com/':params.expression.includes('title:document.title')?{title:'Solana',url:'https://solana.com/'}:{mode:'navigator',tools:[{name:'read'}]}}};
  if(method==='Cloudflare.getLiveView')return {devtoolsFrontendUrl:'https://live.browser.run/test'};
  if(method==='Cloudflare.handoff')return {handoffId:'handoff'};
  return {};
 }
 close(){this.closed=true;}
}
test('CDP session discovers native tools, pauses for handoff, and closes',async()=>{
 const b=new BrowserRun({CLOUDFLARE_ACCOUNT_ID:'a'.repeat(32),CLOUDFLARE_API_TOKEN:'fixture'},fetch,FakeCDP);
 const s=await b.start('https://solana.com/');assert.equal(s.mode,'navigator');assert.equal(s.tools[0].name,'read');
 await b.action(s.id,'handoff',{instructions:'Review'});await assert.rejects(b.action(s.id,'execute',{name:'read',arguments:{}}),/handoff is active/);
 FakeCDP.last.emit('Cloudflare.handoffComplete',{handoffId:'handoff',success:true});assert.equal((await b.action(s.id,'handoff-state')).success,true);
 await b.action(s.id,'tools');await b.close(s.id);assert.equal(b.sessions.size,0);assert.ok(FakeCDP.last.closed);
});
function request(app,path,{method='GET',body,headers={}}={}){return new Promise(resolve=>{const req=Readable.from(body?[JSON.stringify(body)]:[]);Object.assign(req,{url:path,method,headers:{host:'localhost:4173',...headers}});const res=new EventEmitter();res.headers={};res.setHeader=(k,v)=>res.headers[k]=v;res.writeHead=(status,h)=>{res.status=status;Object.assign(res.headers,h);};res.end=data=>resolve({status:res.status,data:JSON.parse(data||'null'),headers:res.headers});app.emit('request',req,res);});}
test('HTTP API rejects cross-origin, invalid hosts, missing CSRF, and missing auth',async()=>{
 const app=createApp({env:{}});const {data}=await request(app,'/api/config');assert.ok(data.csrf);
 assert.equal((await request(app,'/api/config',{headers:{host:'evil.test'}})).status,403);
 assert.equal((await request(app,'/api/config',{headers:{origin:'https://evil.test'}})).status,403);
 assert.equal((await request(app,'/api/solana/resolve',{method:'POST',body:{query:'SOL'}})).status,403);
 const result=await request(app,'/api/solana/resolve',{method:'POST',body:{query:'SOL'},headers:{'x-csrf-token':data.csrf,'content-type':'application/json'}});assert.equal(result.status,200);assert.equal(result.data.result[0].symbol,'SOL');
 const secured=createApp({env:{BROWSER_APP_TOKEN:'fixture'}});assert.equal((await request(secured,'/api/config')).status,401);assert.equal((await request(secured,'/api/config',{headers:{authorization:'Bearer fixture'}})).status,200);
 assert.throws(()=>createApp({env:{BROWSER_HOST:'0.0.0.0'}}),/BROWSER_APP_TOKEN/);
});
test('navigator registration cleans up completed tools on disposal and partial failure',async()=>{
 const oldDoc=globalThis.document;const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');const registered=[],removed=[];
 globalThis.document={};Object.defineProperty(globalThis,'navigator',{configurable:true,value:{modelContext:{registerTool(t){if(t.name==='fail')throw new Error('failure');registered.push(t.name);},unregisterTool(name){removed.push(name);}}}});
 try{const dispose=await registerWebMCPTools([{name:'one'}]);dispose();dispose();assert.deepEqual(removed,['one']);await assert.rejects(registerWebMCPTools([{name:'two'},{name:'fail'}]),/failure/);assert.deepEqual(removed,['one','two']);}
 finally{if(oldDoc===undefined)delete globalThis.document;else globalThis.document=oldDoc;if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else delete globalThis.navigator;}
});
