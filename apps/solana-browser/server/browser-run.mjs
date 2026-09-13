import {randomUUID} from 'node:crypto';
import {CDP, discoverExpression} from './cdp.mjs';
export const SOLANA_SITES = ['https://solana.com/', 'https://explorer.solana.com/', 'https://solana.com/docs'];
export function allowedUrl(raw, extra = []) {
  const url = new URL(raw);
  const origins = new Set([...SOLANA_SITES,...extra].map(u => new URL(u).origin));
  if (url.protocol !== 'https:' || url.username || url.password || !origins.has(url.origin)) throw Object.assign(new Error('Choose an allowed HTTPS Solana site'),{status:400});
  return url.href;
}
export class BrowserRun {
  constructor(env = process.env, fetcher = fetch, CDPClass = CDP) {
    this.env=env;this.fetcher=fetcher;this.CDPClass=CDPClass;this.sessions=new Map();this.jobs=new Set();this.starting=false;
    this.extra = (env.BROWSER_RUN_ALLOWED_ORIGINS || '').split(',').filter(Boolean);
  }
  status() {return {configured:!!(this.env.CLOUDFLARE_ACCOUNT_ID && this.env.CLOUDFLARE_API_TOKEN),mode:'Cloudflare lab',sites:[...SOLANA_SITES,...this.extra],activeSessions:this.sessions.size};}
  credentials() {
    if (!this.status().configured) throw Object.assign(new Error('Cloudflare Browser Run is not configured: set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN on the server'),{status:503});
    if (!/^[a-f0-9]{32}$/i.test(this.env.CLOUDFLARE_ACCOUNT_ID)) throw new Error('Invalid Cloudflare account ID');
    return {Authorization:`Bearer ${this.env.CLOUDFLARE_API_TOKEN}`};
  }
  async request(path, method='GET', body) {
    const headers=this.credentials();
    const r=await this.fetcher(`https://api.cloudflare.com/client/v4/accounts/${this.env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/${path}`,{method,headers:{...headers,'content-type':'application/json'},...(body ? {body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(60000)});
    if (!r.ok) throw Object.assign(new Error(`Cloudflare Browser Run request failed (${r.status}); check token permissions, limits and account access`),{status:502});
    if (r.headers.get('content-type')?.startsWith('image/')) return {contentType:r.headers.get('content-type'),base64:Buffer.from(await r.arrayBuffer()).toString('base64')};
    const data=await r.json();
    if (data.success === false) throw new Error('Cloudflare Browser Run rejected the request');
    return data.result ?? data;
  }
  async evaluate(session, expression) {
    const data=await session.cdp.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},session.pageSession);
    if (data.exceptionDetails) throw new Error(data.exceptionDetails.exception?.description || data.exceptionDetails.text);
    return data.result?.value;
  }
  async start(url) {
    url=allowedUrl(url,this.extra);this.credentials();
    if(this.starting || this.sessions.size >= 2) throw Object.assign(new Error('Close an existing session first (maximum two)'),{status:409});
    this.starting=true;
    let cdp, session;
    try {
      // Direct authenticated CDP connection acquires a lab browser, per Cloudflare's WebMCP guide.
      cdp=new this.CDPClass(`wss://api.cloudflare.com/client/v4/accounts/${this.env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/devtools/browser?keep_alive=300000&lab=true`,this.credentials());
      await cdp.ready;
      const {targetId}=await cdp.send('Target.createTarget',{url:'about:blank'});
      const {sessionId:pageSession}=await cdp.send('Target.attachToTarget',{targetId,flatten:true});
      session={id:randomUUID(),cdp,targetId,pageSession,url,handoff:null};
      await cdp.send('Page.enable',{},pageSession);
      const loaded=new Promise((resolve,reject) => {
        const listener=(_,id)=>{if(id===pageSession){clearTimeout(timer);cdp.off('Page.loadEventFired',listener);resolve();}};
        const timer=setTimeout(()=>{cdp.off('Page.loadEventFired',listener);reject(new Error('Solana page load timed out'));},25000);
        cdp.on('Page.loadEventFired',listener);
      });
      // Attach the rejection handler immediately, even if navigation fails first.
      loaded.catch(()=>{});
      const navigation=await cdp.send('Page.navigate',{url},pageSession);
      if(navigation.errorText) throw new Error(navigation.errorText);
      await loaded;
      cdp.on('Cloudflare.handoffComplete',result => {if(!session.handoff?.handoffId || result.handoffId===session.handoff.handoffId)session.handoff={...result,active:false};});
      const discovery=await this.evaluate(session,discoverExpression);
      const page=await this.evaluate(session,'({title:document.title,url:location.href})');
      allowedUrl(page.url,this.extra);
      session.url=page.url;
      this.sessions.set(session.id,session);
      session.timer=setTimeout(()=>{this.close(session.id).catch(()=>{});},5*60*1000);session.timer.unref?.();
      let liveView=null;
      try{liveView=await cdp.send('Cloudflare.getLiveView',{targetId,mode:'tab',expiresInMs:300000});}catch{}
      return {id:session.id,...page,...discovery,liveView:liveView?.devtoolsFrontendUrl || null,expiresAt:new Date(Date.now()+300000).toISOString()};
    }catch(error){if(cdp){await cdp.send('Browser.close').catch(()=>{});cdp.close();}throw error;}
    finally{this.starting=false;}
  }
  get(id) {const session=this.sessions.get(id);if(!session)throw Object.assign(new Error('Session not found or expired'),{status:404});return session;}
  async action(id,action,input={}) {
    const s=this.get(id);
    if(action==='close') return this.close(id);
    if(action==='handoff-state') return s.handoff || {active:false};
    if(s.handoff?.active) throw Object.assign(new Error('Human handoff is active; finish it in Live View first'),{status:409});
    const currentUrl=await this.evaluate(s,'location.href');allowedUrl(currentUrl,this.extra);
    if(action==='tools') return this.evaluate(s,discoverExpression);
    if(action==='screenshot') {const result=await s.cdp.send('Page.captureScreenshot',{format:'png'},s.pageSession);return {contentType:'image/png',base64:result.data};}
    if(action==='handoff') {
      if(typeof input.instructions !== 'string' || !input.instructions.trim() || input.instructions.length>1000)throw new Error('Provide handoff instructions (1–1000 characters)');
      const view=await s.cdp.send('Cloudflare.getLiveView',{targetId:s.targetId,mode:'tab',expiresInMs:300000});
      s.handoff={active:true};
      try{const result=await s.cdp.send('Cloudflare.handoff',{targetId:s.targetId,instructions:input.instructions,timeout:180000});s.handoff={...s.handoff,...result};return {...s.handoff,liveView:view.devtoolsFrontendUrl};}
      catch(e){s.handoff=null;throw e;}
    }
    if(action==='execute') {
      if(typeof input.name !== 'string' || !input.arguments || typeof input.arguments !== 'object' || Array.isArray(input.arguments))throw new Error('Tool name and arguments object required');
      const args=JSON.stringify(input.arguments), name=JSON.stringify(input.name);
      const expression=`(async()=>{if(document.modelContext?.getTools){const t=(await document.modelContext.getTools()).find(t=>t.name===${name});if(!t)throw Error('Unknown tool');return document.modelContext.executeTool(t,${args});}if(navigator.modelContextTesting){return navigator.modelContextTesting.executeTool(${name},${JSON.stringify(args)});}throw Error('Native WebMCP unavailable');})()`;
      return {result:await this.evaluate(s,expression),discovery:await this.evaluate(s,discoverExpression)};
    }
    throw new Error('Unknown browser action');
  }
  async close(id) {const s=this.get(id);clearTimeout(s.timer);this.sessions.delete(id);try{await s.cdp.send('Browser.close');}finally{s.cdp.close();}return {closed:true};}
  async quick(action,input) {
    if(!['content','screenshot','json','links','crawl'].includes(action))throw new Error('Unknown quick action');
    const url=allowedUrl(input.url,this.extra);
    const body={url,gotoOptions:{waitUntil:'networkidle2',timeout:30000}};
    if(action==='screenshot') {body.screenshotOptions={fullPage:true};body.viewport={width:1440,height:1000,deviceScaleFactor:1};if(input.fontCss){if(typeof input.fontCss!=='string'||input.fontCss.length>200000)throw new Error('Invalid font CSS');body.addStyleTag=[{content:input.fontCss}];}}
    if(action==='links') Object.assign(body,{visibleLinksOnly:true,excludeExternalLinks:true});
    if(action==='json') {if(typeof input.prompt!=='string'||!input.prompt.trim()||input.prompt.length>2000)throw new Error('Provide an extraction prompt');body.prompt=input.prompt;if(input.response_format)body.response_format=input.response_format;}
    if(action==='crawl') {delete body.gotoOptions;Object.assign(body,{limit:Math.min(10,Math.max(1,Number(input.limit)||3)),depth:1,formats:['markdown'],render:false,crawlPurposes:['search'],contentUse:'reference',options:{includeExternalLinks:false,includeSubdomains:false}});}
    const result=await this.request(action,'POST',body);
    if(action==='crawl')this.jobs.add(typeof result==='string'?result:result.id);
    return result;
  }
  async crawl(id,method='GET',cursor) {
    if(!this.jobs.has(id))throw Object.assign(new Error('Unknown crawl job'),{status:404});
    const query=new URLSearchParams({limit:'10'});if(cursor!==undefined)query.set('cursor',String(cursor));
    return this.request(`crawl/${encodeURIComponent(id)}${method==='GET'?`?${query}`:''}`,method);
  }
}
