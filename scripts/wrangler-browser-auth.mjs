import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {access} from 'node:fs/promises';
import {resolve} from 'node:path';
const exec=promisify(execFile);
// Use Wrangler's supported auth command. Credentials stay in this process only.
export async function wranglerBrowserEnv(env=process.env){
 const cli=env.BROWSER_WRANGLER_CLI||resolve(import.meta.dirname,'../browser-worker/node_modules/wrangler/bin/wrangler.js');
 try{await access(cli);}catch{throw new Error('Install browser-worker dependencies, or set BROWSER_WRANGLER_CLI to Wrangler’s bin/wrangler.js');}
 async function run(args){try{const result=await exec(process.execPath,[cli,...args,'--json'],{env:{...env,WRANGLER_SEND_METRICS:'false'},timeout:30000,maxBuffer:1024*1024});return JSON.parse(result.stdout);}catch{throw new Error('Wrangler authentication failed. Run wrangler login, then try again.');}}
 const identity=await run(['whoami']);
 const account=env.CLOUDFLARE_ACCOUNT_ID||(identity.accounts?.length===1?identity.accounts[0].id:null);
 if(!account)throw new Error('Set CLOUDFLARE_ACCOUNT_ID to choose among your Wrangler accounts');
 const auth=await run(['auth','token']);
 if(!auth.token)throw new Error('Browser Run needs a Wrangler OAuth token or API token');
 return {...env,CLOUDFLARE_ACCOUNT_ID:account,CLOUDFLARE_API_TOKEN:auth.token};
}
