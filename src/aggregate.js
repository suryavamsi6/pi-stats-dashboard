import { readdir, readFile } from "node:fs/promises";
import { join, relative, basename } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import { computeBehavior } from "./behavior.js";

export const sessionsRoot = join(homedir(), ".pi", "agent", "sessions");
const zero = () => ({ requests: 0, errors: 0, input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0, tokens: 0, cost: 0, priced: 0 });
const key = x => `${x.provider ?? "unknown"}/${x.model ?? "unknown"}`;
function add(a, u, error = false) { const input=+u.input||0, output=+u.output||0, reasoning=+u.reasoning||0, cacheRead=+u.cacheRead||0, cacheWrite=+u.cacheWrite||0; a.requests++; a.errors += error ? 1 : 0; a.input+=input; a.output+=output; a.reasoning+=reasoning; a.cacheRead+=cacheRead; a.cacheWrite+=cacheWrite; a.tokens+=input+output+reasoning+cacheRead+cacheWrite; const c=u.cost?.total; if (typeof c === "number" && Number.isFinite(c)) { a.cost+=c; a.priced++; } }
function idHash(x) { return createHash("sha1").update(JSON.stringify([x.type ?? x.recordType, x.id ?? x.toolCallId, x.timestamp ?? x.ts, x.message?.usage ?? x.usage])).digest("hex"); }
async function walk(dir) { let out=[]; try { for (const e of await readdir(dir,{withFileTypes:true})) { const p=join(dir,e.name); if(e.isDirectory()) out=out.concat(await walk(p)); else if(e.name.endsWith(".jsonl")) out.push(p); } } catch {} return out; }
function projectOf(file) { const rel=relative(sessionsRoot,file).split("/"); return rel[0] ? rel[0].replace(/^-+/g,"/").replace(/-/g,"/") : "unknown"; }
function emptyGroup() { return new Map(); }
function userText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map(part => typeof part === "string" ? part : part?.type === "text" ? part.text : "").filter(Boolean).join("\n");
}
export async function aggregate(root=sessionsRoot, now=Date.now()) {
  const files=await walk(root), seen=new Set(), seenTools=new Set(), all=zero(), ranges={all:zero(),today:zero(),week:zero(),month:zero()}, groups={model:emptyGroup(),provider:emptyGroup(),project:emptyGroup(),agent:emptyGroup(),tool:emptyGroup()}, days=new Map(), behavior={messages:0,chars:0,words:0,yelling:0,profanity:0,anguish:0,negation:0,repetition:0,blame:0}, diagnostics={files:files.length,invalidLines:0,skippedRecords:0,standardSessions:0,transcriptFiles:0};
  const midnight=new Date(); midnight.setHours(0,0,0,0); const cutoffs={today:midnight.getTime(),week:midnight.getTime()-6*86400000,month:midnight.getTime()-29*86400000};
  function request(m, meta) { const ts=Number(m.timestamp)||meta.timestamp||0, u=m.usage; if(!u || typeof u!=="object") {diagnostics.skippedRecords++;return} const item={provider:m.provider,model:m.model,agent:meta.agent,project:meta.project,tool:meta.tool,timestamp:ts}; const sig=idHash({type:"message",id:meta.id,timestamp:ts,message:{usage:u}}); if(seen.has(sig))return; seen.add(sig); add(all,u,m.stopReason==="error"); const groupKeys={model:key(m),provider:m.provider??"unknown",project:meta.project,agent:meta.agent}; for(const [kind,k] of Object.entries(groupKeys)){const g=groups[kind].get(k)||zero();add(g,u,m.stopReason==="error");groups[kind].set(k,g)} const day=new Date(ts).toISOString().slice(0,10), d=days.get(day)||zero();add(d,u,m.stopReason==="error");days.set(day,d);for(const [name,cut] of Object.entries(cutoffs))if(ts>=cut)add(ranges[name],u,m.stopReason==="error"); }
  for(const file of files) { const text=await readFile(file,"utf8"); const standard=text.split("\n").some(l=>{try{return JSON.parse(l).type==="session"}catch{return false}}); if(standard) diagnostics.standardSessions++; else diagnostics.transcriptFiles++;
    let lastModel={}; for(const line of text.split("\n")){if(!line.trim())continue;let x;try{x=JSON.parse(line)}catch{diagnostics.invalidLines++;continue} const meta={id:x.id, timestamp:Date.parse(x.timestamp)||0, project:projectOf(file), agent:standard?"main":basename(file).split("_")[0]||"subagent"};
      if(standard && x.type==="message"){const m=x.message;if(m?.role==="user"){const text=userText(m.content);const b=computeBehavior(text);for(const k of Object.keys(b))behavior[k]=(behavior[k]||0)+b[k];behavior.messages++} if(m?.role==="assistant"){lastModel={provider:m.provider,model:m.model};request(m,meta);for(const c of Array.isArray(m.content)?m.content:[])if(c?.type==="toolCall"&&!seenTools.has(`${meta.id}:${c.id}`)){seenTools.add(`${meta.id}:${c.id}`);const g=groups.tool.get(c.name)||zero();g.requests++;groups.tool.set(c.name,g)}} if(m?.role==="toolResult"&&m.usage)request({...m,...lastModel}, {...meta,tool:m.toolName||"nested"});}
      else if(standard && (x.type==="compaction"||x.type==="branch_summary") && x.usage)request({...x,...lastModel},meta);
      else if(!standard && x.recordType==="message" && x.role==="assistant")request(x,meta);
    }
  }
  ranges.all={...all}; return {generatedAt:now, totals:{all,...all}, ranges, by:{model:Object.fromEntries(groups.model),provider:Object.fromEntries(groups.provider),project:Object.fromEntries(groups.project),agent:Object.fromEntries(groups.agent),tool:Object.fromEntries(groups.tool)}, days:Object.fromEntries([...days].sort()), behavior, diagnostics};
}
