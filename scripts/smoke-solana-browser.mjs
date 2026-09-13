import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.BROWSER_TEST_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-features=WebMCPTesting','--enable-blink-features=WebMCP,WebMCPTesting']});
const report={observedAt:new Date().toISOString(),browser:browser.version(),url:base,nativeTestingEnabled:true};
try{
 const page=await browser.newPage({viewport:{width:1440,height:1080}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.waitForFunction(()=>window.solanaWebMCP&&document.modelContext?.getTools);
 report.native=await page.evaluate(async()=>{
  const tools=await document.modelContext.getTools();
  const run=async(name,args)=>JSON.parse(await document.modelContext.executeTool(tools.find(t=>t.name===name),JSON.stringify(args)));
  const decode=result=>JSON.parse(result.content[0].text);
  const tokens=decode(await run('solana.resolve_token',{query:'SOL'}));
  const network=decode(await run('solana.get_network_status',{}));
  const ticket=decode(await run('solana.stage_swap',{inputMint:tokens[0].mint,outputMint:'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',amount:'0.1',slippageBps:50,swapMode:'ExactIn'}));
  const declarative=await run('solana_search_token',{query:'USDC'});
  return {toolNames:tools.map(t=>t.name),resolvedMint:tokens[0].mint,network,ticket,declarativeMint:declarative[0].mint,reviewVisible:!document.getElementById('ticket').hidden};
 });
 assert.equal(report.native.toolNames.length,8);assert.equal(report.native.ticket.amount,'0.1');assert.equal(report.native.ticket.broadcast,false);assert.equal(report.native.reviewVisible,true);assert.ok(report.native.network.slot>0);
 await mkdir('artifacts',{recursive:true});await page.screenshot({path:'artifacts/solana-native-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Dismiss ticket',exact:true}).click();
 await page.setViewportSize({width:390,height:844});
 report.mobile=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,hasHorizontalOverflow:document.documentElement.scrollWidth>innerWidth}));
 assert.equal(report.mobile.hasHorizontalOverflow,false);await page.screenshot({path:'artifacts/solana-browser-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'03 / Agent tools',exact:true}).click();await page.getByText('Connect a legacy MCP client',{exact:true}).click();await page.getByRole('button',{name:'Enable legacy widget',exact:true}).click();
 assert.equal(await page.locator('[data-webmcp-widget]').count(),1);report.legacyWidget=true;
 assert.deepEqual(errors,[]);report.pageErrors=errors;report.status='passed';
}catch(error){report.status='failed';report.error=error.message;process.exitCode=1;}
finally{await browser.close();await mkdir('artifacts',{recursive:true});await writeFile('artifacts/solana-browser-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
