import {BrowserRun} from '../apps/solana-browser/server/browser-run.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {wranglerBrowserEnv} from './wrangler-browser-auth.mjs';
const env=process.argv.includes('--wrangler')?await wranglerBrowserEnv():process.env;
const browser=new BrowserRun(env);
const report={startedAt:new Date().toISOString(),provider:'Cloudflare Browser Run lab',destination:process.argv.slice(2).find(arg=>!arg.startsWith('--'))||'https://solana.com/',status:'pending'};
let session;
try{
  session=await browser.start(report.destination);
  const screenshot=await browser.action(session.id,'screenshot');
  await mkdir('artifacts',{recursive:true});await writeFile('artifacts/solana-cloudflare-run.png',Buffer.from(screenshot.base64,'base64'));
  Object.assign(report,{status:'passed',title:session.title,url:session.url,mode:session.mode,tools:session.tools,screenshot:'artifacts/solana-cloudflare-run.png'});
}catch(error){report.status='blocked';report.error=error.message;process.exitCode=1;}
finally{if(session)await browser.close(session.id).catch(error=>{report.cleanupError=error.message;process.exitCode=1;});await mkdir('artifacts',{recursive:true});await writeFile('artifacts/solana-cloudflare-run.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
