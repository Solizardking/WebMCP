import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {createSolanaService} from './solana.mjs';
import {BrowserRun} from './browser-run.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const publicDir=resolve(root,'build/solana-browser');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.md':'text/plain; charset=utf-8','.bs':'text/plain; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.yml':'text/plain'};
export function createApp({env=process.env,fetcher=fetch,browser=new BrowserRun(env,fetcher)}={}) {
  const solana=createSolanaService(env,fetcher);
  const csrf=randomBytes(24).toString('hex');
  const remoteHost=env.BROWSER_HOST && !['127.0.0.1','localhost','::1'].includes(env.BROWSER_HOST);
  if(remoteHost && !env.BROWSER_APP_TOKEN)throw new Error('BROWSER_APP_TOKEN is required when binding beyond loopback');
  const matches=(a,b)=>typeof a==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
  const send=(res,status,data)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(data));};
  const server=createServer(async(req,res)=>{
    res.setHeader('cache-control','no-store');res.setHeader('x-content-type-options','nosniff');res.setHeader('referrer-policy','no-referrer');
    res.setHeader('content-security-policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws://localhost:* ws://127.0.0.1:*; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try{
      const url=new URL(req.url,'http://localhost');
      const host=(req.headers.host||'').split(':')[0];
      const allowedHosts=['localhost','127.0.0.1',...(env.BROWSER_PUBLIC_HOSTS||'').split(',').filter(Boolean)];
      if(!allowedHosts.includes(host))return send(res,403,{error:'Host not allowed'});
      if(url.pathname==='/healthz')return send(res,200,{ok:true,service:'CLAWD Solana Browser'});
      if(url.pathname.startsWith('/api/')){
        if(req.headers.origin && req.headers.origin!==`http://${req.headers.host}` && req.headers.origin!==`https://${req.headers.host}`)return send(res,403,{error:'Cross-origin request denied'});
        if(env.BROWSER_APP_TOKEN && !matches(req.headers.authorization,`Bearer ${env.BROWSER_APP_TOKEN}`))return send(res,401,{error:'Enter the browser application access token'});
        if(url.pathname==='/api/config'&&req.method==='GET')return send(res,200,{csrf,browser:browser.status(),quoteConfigured:!!env.JUPITER_API_KEY});
        if(req.method!=='POST')return send(res,405,{error:'POST required'});
        if(!matches(req.headers['x-csrf-token'],csrf))return send(res,403,{error:'Refresh this page before continuing'});
        if(!req.headers['content-type']?.startsWith('application/json'))return send(res,415,{error:'JSON required'});
        let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>262144)throw Object.assign(new Error('Request too large'),{status:413});}
        let input;try{input=JSON.parse(raw||'{}');}catch{throw Object.assign(new Error('Invalid JSON'),{status:400});}
        if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Expected an object');
        let result;
        switch(url.pathname){
          case '/api/solana/network':result=await solana.network(input.network||'mainnet-beta');break;
          case '/api/solana/wallet':result=await solana.wallet(input.publicKey,input.network||'mainnet-beta');break;
          case '/api/solana/resolve':result=await solana.resolve(input.query);break;
          case '/api/solana/market':result=await solana.market(input.mint);break;
          case '/api/solana/inspect':result=await solana.inspect(input.signature,input.network||'mainnet-beta');break;
          case '/api/solana/quote':result=await solana.quote(input);break;
          case '/api/browser/start':result=await browser.start(input.url);break;
          case '/api/browser/action':result=await browser.action(input.id,input.action,input);break;
          case '/api/browser/quick':result=await browser.quick(input.action,input);break;
          case '/api/browser/crawl':result=await browser.crawl(input.id,input.cancel?'DELETE':'GET',input.cursor);break;
          default:return send(res,404,{error:'Unknown endpoint'});
        }
        return send(res,200,{result});
      }
      if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,{error:'GET required'});
      const pathname=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
      if(pathname.split('/').some(p=>p.startsWith('.')))return send(res,404,{error:'Not found'});
      const target=resolve(publicDir,'.'+pathname);
      if(!target.startsWith(publicDir+sep))return send(res,404,{error:'Not found'});
      const content=await readFile(target);res.writeHead(200,{'content-type':mime[extname(target)]||'text/plain; charset=utf-8'});res.end(req.method==='HEAD'?undefined:content);
    }catch(error){send(res,error.code==='ENOENT'?404:(error.status||400),{error:error.code==='ENOENT'?'Not found':error.message});}
  });
  server.on('close',()=>{for(const id of browser.sessions.keys())browser.close(id).catch(()=>{});});
  return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const app=createApp();const port=Number(process.env.BROWSER_PORT||4173);
  app.listen(port,process.env.BROWSER_HOST||'127.0.0.1',()=>console.log(`CLAWD Solana Browser: http://127.0.0.1:${port}`));
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{app.close();app.closeAllConnections();});
}
