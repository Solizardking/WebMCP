import {build} from 'esbuild';
import {mkdir,cp,readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,relative} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const out=resolve(root,'build/solana-browser');
await mkdir(out,{recursive:true});
await cp(resolve(root,'apps/solana-browser/public'),out,{recursive:true});
await build({entryPoints:[resolve(root,'apps/solana-browser/app.mjs')],outfile:resolve(out,'app.js'),bundle:true,format:'esm',platform:'browser',target:'es2022',sourcemap:true});
// Keep every named upstream source and its legal/governance context in the integration bundle.
const manifest=[];
for(const [source,dest] of [['webmcp-main 2','spec'],['WebMCP-main 3','legacy-source']]){
  const base=resolve(root,source);
  async function copy(dir){for(const entry of await readdir(dir,{withFileTypes:true})){
    if(['node_modules','build','.git','.DS_Store'].includes(entry.name)||entry.name.startsWith('.env'))continue;
    const path=resolve(dir,entry.name);if(entry.isDirectory()){await copy(path);continue;}if(!entry.isFile())continue;
    const rel=relative(base,path);const target=resolve(out,dest,rel);await mkdir(resolve(target,'..'),{recursive:true});await cp(path,target);
    manifest.push({source:`${source}/${rel}`,bundled:`${dest}/${rel}`,sha256:createHash('sha256').update(await readFile(path)).digest('hex')});
  }}await copy(base);
}
await cp(resolve(root,'docs/solana-browser.md'),resolve(out,'integration.md'));
await writeFile(resolve(out,'integration-manifest.json'),JSON.stringify({generatedAt:new Date().toISOString(),files:manifest},null,2)+'\n');
console.log(`Built Solana Browser and preserved ${manifest.length} upstream files`);
