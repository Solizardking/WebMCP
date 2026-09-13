// Consume Wrangler's private --json session output; never copy signed URLs to reports.
import {readFile,writeFile} from 'node:fs/promises';
import {CDP,discoverExpression} from '../apps/solana-browser/server/cdp.mjs';
const session=JSON.parse(await readFile(process.argv[2],'utf8'));
const target=session.targets?.find(t=>t.type==='page');
if(!target?.webSocketDebuggerUrl)throw new Error('Wrangler did not return a page debugger endpoint');
const cdp=new CDP(target.webSocketDebuggerUrl);
const report={provider:'Cloudflare Browser Run lab',auth:'existing Wrangler login',startedAt:new Date().toISOString(),status:'pending',destination:'https://solana.com/'};
async function evaluate(expression){const r=await cdp.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result.value;}
try{
 await cdp.ready;await cdp.send('Page.enable');
 const loaded=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Navigation timeout')),25000);cdp.once('Page.loadEventFired',()=>{clearTimeout(timer);resolve();});});loaded.catch(()=>{});
 const nav=await cdp.send('Page.navigate',{url:report.destination});if(nav.errorText)throw new Error(nav.errorText);await loaded;
 Object.assign(report,await evaluate('({title:document.title,url:location.href,userAgent:navigator.userAgent})'));
 Object.assign(report,await evaluate(discoverExpression));
 const image=await cdp.send('Page.captureScreenshot',{format:'png'});await writeFile('artifacts/solana-cloudflare-run.png',Buffer.from(image.data,'base64'));
 report.screenshot='artifacts/solana-cloudflare-run.png';report.status='passed';
}catch(e){report.status='failed';report.error=e.message;process.exitCode=1;}
finally{await cdp.send('Browser.close').catch(()=>{});cdp.close();await writeFile('artifacts/solana-cloudflare-run.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
