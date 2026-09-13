import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {createServer} from 'node:net';
import WebSocket from 'ws';
const require=createRequire(new URL('../WebMCP-main 3/package.json',import.meta.url));
const {Client}=await import(pathToFileURL(require.resolve('@modelcontextprotocol/sdk/client/index.js')));
const {StdioClientTransport}=await import(pathToFileURL(require.resolve('@modelcontextprotocol/sdk/client/stdio.js')));
const dir=await mkdtemp(join(tmpdir(),'solana-legacy-'));
const reserve=createServer();await new Promise(r=>reserve.listen(0,'127.0.0.1',r));const port=reserve.address().port;await new Promise(r=>reserve.close(r));
const client=new Client({name:'solana-integration-smoke',version:'1.0.0'});
const transport=new StdioClientTransport({command:process.execPath,args:[resolve('WebMCP-main 3/build/index.js'),'--mcp','--foreground','--port',String(port)],env:{...process.env,WEBMCP_CONFIG_DIR:dir,WEBMCP_SERVER_TOKEN:randomBytes(32).toString('hex')},stderr:'pipe'});
// Keep diagnostics private: upstream can include transport details in errors.
let diagnostic='';transport.stderr?.on('data',b=>{diagnostic+=b;});
const sockets=[];
function connect(path,origin='http://localhost:4173'){
 const ws=new WebSocket(`ws://localhost:${port}${path}`,{origin});sockets.push(ws);
 return new Promise((resolve,reject)=>{ws.once('open',()=>resolve(ws));ws.once('error',reject);});
}
function message(ws,predicate,send){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.off('message',listener);reject(new Error('Legacy response timed out'));},10000);function listener(raw){const d=JSON.parse(raw);if(predicate(d)){clearTimeout(timer);ws.off('message',listener);resolve(d);}}ws.on('message',listener);send?.();});}
try{
 await client.connect(transport);
 const tokenResponse=await client.callTool({name:'_webmcp_get-token',arguments:{}});
 const encoded=tokenResponse.content[0].text.trim().split('\n').at(-1);const token=JSON.parse(Buffer.from(encoded,'base64').toString()).token;
 const registration=await connect('/register');
 const success=await message(registration,d=>d.type==='registerSuccess'||d.type==='error',()=>registration.send(Buffer.from(JSON.stringify({host:'localhost:4173',token})).toString('base64')));
 if(success.type!=='registerSuccess')throw new Error('Registration rejected');
 // A consumed registration token must fail on replay.
 const replay=await connect('/register');const rejected=await message(replay,d=>d.type==='error',()=>replay.send(Buffer.from(JSON.stringify({host:'localhost:4173',token})).toString('base64')));
 if(!rejected)throw new Error('Registration token replay accepted');
 const website=await connect(`${success.channel}?token=${success.token}`);
 await message(website,d=>d.type==='toolRegistered',()=>website.send(JSON.stringify({type:'registerTool',name:'solana.read_context',description:'Read test page context',inputSchema:{type:'object',properties:{}}})));
 website.on('message',raw=>{const data=JSON.parse(raw);if(data.type==='callTool')website.send(JSON.stringify({id:data.id,type:'toolResponse',result:{content:[{type:'text',text:JSON.stringify({network:'devnet',source:'test fixture'})}]}}));});
 const listed=await client.listTools();const tool=listed.tools.find(t=>t.name.endsWith('solana.read_context'));if(!tool)throw new Error('Browser tool missing from MCP catalog');
 const result=await client.callTool({name:tool.name,arguments:{}});if(!result.content[0].text.includes('devnet'))throw new Error('Tool response did not round-trip');
 const report={status:'passed',transport:'stdio MCP → authenticated WebSocket → page protocol',registration:true,tokenReplayRejected:true,toolListed:tool.name,toolExecuted:true,fixture:true,observedAt:new Date().toISOString()};await writeFile('artifacts/legacy-smoke.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}catch(error){console.error(error.message);if(diagnostic)await writeFile(join(dir,'diagnostic.log'),diagnostic,{mode:0o600});process.exitCode=1;}
finally{for(const ws of sockets)ws.terminate();await client.close().catch(()=>{});await transport.close().catch(()=>{});await rm(dir,{recursive:true,force:true});}
