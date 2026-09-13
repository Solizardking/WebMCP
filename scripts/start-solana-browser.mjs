import {createApp} from '../apps/solana-browser/server/index.mjs';
import {wranglerBrowserEnv} from './wrangler-browser-auth.mjs';
try{
 const env=process.argv.includes('--wrangler')?await wranglerBrowserEnv():process.env;
 const app=createApp({env});const port=Number(env.BROWSER_PORT||4173);
 app.listen(port,env.BROWSER_HOST||'127.0.0.1',()=>console.log(`CLAWD Solana Browser: http://127.0.0.1:${port} (Cloudflare ${env.CLOUDFLARE_API_TOKEN?'configured':'not configured'})`));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{app.close();app.closeAllConnections();});
}catch(error){console.error(error.message);process.exitCode=1;}
