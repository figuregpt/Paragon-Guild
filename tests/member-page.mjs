import vm from 'node:vm';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const env={MEMBERS_ONLY:'true',APP_ORIGIN:'https://guild.test',DEMO_RUNTIME:{enabled:true}};
const requestHeaders=new Headers({cookie:'pg_session=test-only'});
const calls=[];
class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
let failure=null;
const App=()=>null,SignIn=()=>null;
const context=vm.createContext({Request,URL,console:{error(){}}});
const exports={
 './guild-app':{default:App},'./guild-sign-in':{default:SignIn},
 'next/headers':{headers:async()=>requestHeaders},'cloudflare:workers':{env},
 'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
 '@/lib/auth':{configReady:()=>true,HttpError,localRequest:()=>true,requireMember:async(...args)=>{calls.push(args);if(failure)throw failure;return {id:'real-member'};}},
};
const source=ts.transpileModule(readFileSync('app/page.tsx','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const module=new vm.SourceTextModule(source,{context});
await module.link(spec=>new vm.SyntheticModule(Object.keys(exports[spec]),function(){for(const [key,value] of Object.entries(exports[spec]))this.setExport(key,value);},{context}));
await module.evaluate();
const page=module.namespace.default;
const render=(params={})=>page({searchParams:Promise.resolve(params)});
assert.equal(module.namespace.dynamic,'force-dynamic');assert.equal(module.namespace.revalidate,0);
assert.equal((await render()).type,App);assert.equal(calls[0][0].headers.get('cookie'),'pg_session=test-only');assert.equal(calls[0][1],false);assert.equal(calls[0][2],true);
failure=new HttpError(401,'Sign in again');let result=await render();assert.equal(result.type,SignIn);assert.equal(result.props.message,undefined);
failure=new HttpError(403,'Member role required');result=await render();assert.equal(result.type,SignIn);assert.equal(result.props.message,'Member role required');
failure=new HttpError(503,'Discord unavailable');assert.equal((await render()).type,SignIn);
failure=new Error('private internal detail');result=await render();assert.equal(result.type,SignIn);assert.ok(!result.props.message.includes('private'));
failure=new HttpError(401,'');result=await render({signin:'x'.repeat(1000)});assert.equal(result.props.message.length,300);
const before=calls.length;env.MEMBERS_ONLY='false';assert.equal((await render()).type,App);assert.equal(calls.length,before);
console.log('PASS: members-only page checks current membership before rendering, blocks demo/local bypass, denies non-members and verification outages, limits public errors, and disables HTML caching.');
