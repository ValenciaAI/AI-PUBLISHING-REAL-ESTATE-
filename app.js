(() => {
"use strict";
const $=s=>document.querySelector(s), canvas=$("#stationCanvas"), ctx=canvas.getContext("2d");
const C={helm:"#ef5a52",forge:"#eda63a",sentinel:"#8d74d6",scout:"#a6cf58",archive:"#50bcb5",relay:"#4e91cf",warden:"#d46a9e",green:"#a6cf58",amber:"#c99b3b",red:"#ef5a52",cyan:"#50bcb5",muted:"#747474"};
const bridge=window.portalLink||null;
const ledger=window.listingLedger||null,artifactPackets=[],commSignals=[];
let selectedArtifactId=null,ledgerToastTimer=null,commSequence=0;
const INPUT_KEY="estate-ops.input.v1";
const DEFAULT_MISSION={
 seller:{name:"Anna Kowalska",phone:"+48 601 234 567",photo:"photo_apartment.jpg",description:"Bright 2-room flat with a balcony, parking spot and a quiet neighbourhood.",video:"https://www.youtube.com/watch?v=RE-APARTMENT-TOUR"},
 portals:["OLX","Otodom","Morizon","Gratka","Domiporta","Nieruchomosci.pl"],
 credentials:{},
 mandatory:[{label:"Price",value:"449 000 PLN"},{label:"Area",value:"48 m²"},{label:"Rooms",value:"2"},{label:"Floor",value:"3/5"},{label:"Address",value:"ul. Kwiatowa 5, Warszawa"},{label:"Energy class",value:"C"},{label:"Balcony",value:"Yes"}]
};
function loadInput(){try{const s=JSON.parse(localStorage.getItem(INPUT_KEY)||"null");if(s&&s.seller)return s}catch{}return JSON.parse(JSON.stringify(DEFAULT_MISSION))}
function saveInput(){try{localStorage.setItem(INPUT_KEY,JSON.stringify(state.mission))}catch{}}
const state={running:false,paused:false,approval:false,complete:false,rejected:false,elapsed:0,duration:360000,last:performance.now(),cursor:0,verifyCursor:0,speed:1,count:0,spend:0,artifacts:0,particles:[],selected:"helm",ambientAt:performance.now()+1800,mode:"mission",publishedUrls:[],mission:loadInput()};
state.mission.seoTitle=generateSeoTitleSafe();
const zones=[
 {id:"command",name:"COMMAND DESK",x:25,y:110,w:200,h:125,color:C.helm,type:"bridge"},
 {id:"media",name:"MEDIA DESK",x:245,y:110,w:200,h:125,color:C.scout,type:"skill"},
 {id:"writing",name:"WRITING DESK",x:465,y:110,w:200,h:125,color:C.forge,type:"build"},
 {id:"publish",name:"PUBLISH DESK",x:685,y:110,w:205,h:125,color:C.relay,type:"airlock"},
 {id:"registry",name:"REGISTRY DESK",x:25,y:325,w:200,h:135,color:C.archive,type:"vault"},
 {id:"audit",name:"COMPLIANCE DESK",x:245,y:325,w:200,h:135,color:C.sentinel,type:"audit"},
 {id:"verify",name:"VERIFY DESK",x:465,y:325,w:200,h:135,color:C.warden,type:"verify"}
];
const points={command:{x:125,y:215},media:{x:345,y:215},writing:{x:565,y:215},publish:{x:787,y:215},registry:{x:125,y:430},audit:{x:345,y:430},verify:{x:565,y:430},core:{x:455,y:270},monitor:{x:500,y:92},photo:{x:82,y:292},draft:{x:310,y:300},lounge:{x:755,y:292},server:{x:835,y:350}};
const initial=[
 {id:"helm",name:"Helm",letter:"H",role:"Chief of Staff",color:C.helm,state:"idle",task:"Awaiting seller brief",zone:"command",x:125,y:215,tx:125,ty:215},
 {id:"scout",name:"Scout",letter:"S",role:"Media Specialist",color:C.scout,state:"idle",task:"Media bench standing by",zone:"media",x:345,y:215,tx:345,ty:215},
 {id:"forge",name:"Forge",letter:"F",role:"SEO Copywriter",color:C.forge,state:"idle",task:"Variant writer ready",zone:"writing",x:565,y:215,tx:565,ty:215},
 {id:"archive",name:"Archive",letter:"A",role:"Account Registrar",color:C.archive,state:"idle",task:"Portal registry synced",zone:"registry",x:125,y:430,tx:125,ty:430},
 {id:"sentinel",name:"Sentinel",letter:"S",role:"Compliance Auditor",color:C.sentinel,state:"idle",task:"Monitoring listing rules",zone:"audit",x:345,y:430,tx:345,ty:430},
 {id:"relay",name:"Relay",letter:"R",role:"Publisher / External Ops",color:C.relay,state:"idle",task:"Publish desk standing by",zone:"publish",x:787,y:215,tx:787,ty:215},
 {id:"warden",name:"Warden",letter:"W",role:"Verification Controller",color:C.warden,state:"idle",task:"Verifying live listings",zone:"verify",x:565,y:430,tx:565,ty:430}
];
let agents=initial.map(a=>({...a}));
const stages=["intake","register","content","compliance","publish","verify"];
function generateSeoTitleSafe(){try{return generateSeoTitle()}catch{return "2-room flat 48 m² · balcony · Warszawa"}}
function generateSeoTitle(){
 const m=state.mission,f=(re,fb)=>{const x=m.mandatory.find(k=>re.test(k.label));return x?x.value:fb};
 const rooms=f(/room|pokoj|комн/i,"2"),area=f(/area|powierzchn|площадь/i,"48 m²"),city=f(/city|miasto|город/i,"Warszawa");
 return rooms+"-room flat "+area+" · balcony · "+city+" — quick sale";
}
const timeline=[
 {at:1000,run(){const m=state.mission;event("helm","Listing opened","RE-042 received with seller brief, mandatory data, and portal accounts.","cyan");agent("helm","working","parsing seller & portals","command");stage("intake",1,"Scoping the publishing mission","Helm is parsing the seller brief, mandatory fields, and the portal account list.")}},
 {at:10000,run(){event("helm","Work graph created","3 workstreams — content, registration, verification — plus one approval gate.","green");agent("helm","delegating","routing scope","core");agent("scout","working","receiving content brief","core");agent("archive","working","receiving portal accounts","core");sendComm("helm","scout","scope.route · seller + mandatory fields","route");sendComm("helm","archive","accounts.route · portal cabinets for login","route");sealArtifact({baseId:"seller-brief",type:"intake",label:"SELLER BRIEF",createdBy:"helm",payload:{name:state.mission.seller.name,phone:"masked",photo:true,video:!!state.mission.seller.video,portals:state.mission.portals.length,mandatory:state.mission.mandatory.length}})}},
 {at:20000,run(){event("archive","Account registration started","Logging into personal cabinets on "+state.mission.portals.length+" portals with provided credentials.","cyan");agent("helm","idle","watching dependency graph","lounge");agent("archive","working","registering personal cabinets","registry");stage("register",18,"Registering portal accounts","Archive is logging into or registering profiles on each portal from the list.")}},
 {at:33000,run(){event("scout","Media validation started","Photo and video link checked against the mandatory listing fields.","cyan");agent("scout","working","validating photo & video","media");stage("content",20,"Media pack in progress","Scout is validating the seller photo and the optional YouTube video.")}},
 {at:47000,run(){event("scout","Media pack ready","Photo normalized; mandatory fields confirmed for every listing.","green");agent("scout","working","rendering media pack","photo");state.artifacts=2;sealArtifact({baseId:"media-pack",type:"media",label:"MEDIA PACK",createdBy:"scout",parentIds:["seller-brief"],payload:{photo:true,video:!!state.mission.seller.video}})}},
 {at:60000,run(){event("forge","SEO copywriting started","Generating a selling title and description from mandatory data.","cyan");agent("forge","working","writing SEO selling title","writing");stage("content",34,"Writing SEO listings","Forge is producing the selling title and portal-ready listing copy.")}},
 {at:76000,run(){state.mission.seoTitle=generateSeoTitle();event("forge","SEO title ready","Selling title generated: \""+state.mission.seoTitle+"\"","green");agent("forge","working","rendering listing draft","writing");state.artifacts=4;sealArtifact({baseId:"seo-title",type:"seo_title",label:"SEO SELLING TITLE",createdBy:"forge",parentIds:["media-pack"],payload:{title:state.mission.seoTitle}})}},
 {at:92000,run(){event("archive","Accounts ready",""+(Object.keys(state.mission.credentials).length?Object.keys(state.mission.credentials).length+" cabinets authenticated":"6 profiles registered for first use")+" · sessions stored in vault.","green");agent("archive","working","storing portal sessions","registry");sealArtifact({baseId:"portal-accounts",type:"portal_credentials",label:"PORTAL ACCOUNTS",createdBy:"archive",parentIds:["seller-brief"],payload:{provided:Object.keys(state.mission.credentials).length,registered:state.mission.portals.length-Object.keys(state.mission.credentials).length}})}},
 {at:108000,run(){event("forge","6 listing variants written","SEO title + mandatory fields rendered for each portal.","green");agent("forge","working","rendering 6 variants","writing");state.artifacts=9;sealArtifact({baseId:"listing-variants",type:"listing_variants",label:"6 LISTING VARIANTS",createdBy:"forge",parentIds:["seo-title","portal-accounts"],payload:{variants:state.mission.portals.length,seoTitle:state.mission.seoTitle,mandatory:state.mission.mandatory.length}})}},
 {at:122000,run(){event("forge","Listing pack handed to compliance","6 variants, media, and account sessions routed.","cyan");agent("forge","delegating","handing off listing pack","core");agent("sentinel","working","receiving listing pack","core");sendComm("forge","sentinel","listing.pack · 6 variants + media + accounts","handoff");stage("compliance",55,"Compliance audit in progress","Sentinel is testing every variant against portal rules and mandatory-field policy.");sealArtifact({baseId:"listing-pack",type:"listing_pack",label:"LISTING PACK",createdBy:"forge",parentIds:["listing-variants","portal-accounts"],payload:{variants:state.mission.portals.length,media:true}})}},
 {at:136000,run(){event("sentinel","Compliance audit started","Mandatory fields, phone masking, photo policy, and portal rules loaded.","violet");agent("archive","idle","portal vault synced","registry");agent("sentinel","reviewing","cross-checking 6 listings","audit")}},
 {at:150000,run(){event("sentinel","Phone-exposure warning","Raw seller phone detected on 3 variants; masking required.","red");agent("sentinel","reviewing","masking phone contact","audit")}},
 {at:164000,run(){event("sentinel","Compliance passed","6/6 listings comply; mandatory fields present in every ad.","green");agent("sentinel","reviewing","running final checks","monitor");ledgerCall("auditArtifact","listing-pack","sentinel",6)}},
 {at:178000,run(){event("sentinel","Audit report sealed","Compliance and mandatory-field checks recorded.","green");agent("sentinel","complete","audit passed 6/6","audit");sealArtifact({baseId:"compliance-report",type:"compliance_report",label:"COMPLIANCE 6/6",createdBy:"sentinel",parentIds:["listing-pack"],payload:{checks:6,verdict:"pass",phoneMasked:true}})}},
 {at:192000,run(){event("relay","Publication packet staged","6 portal payloads ready at the airlock.","cyan");agent("helm","working","assembling decision packet","core");agent("relay","working","receiving approved pack","core");sendComm("sentinel","relay","compliance.receipt · 6/6 pass / phone masked","audit");stage("publish",82,"Preparing the controlled release","Helm and Relay are assembling the final publish decision packet.")}},
 {at:205000,run(){event("relay","Human decision requested","Publication of 6 listings is paused at the Approval Airlock.","amber");stage("publish",92,"Final approval required","The complete listing pack is waiting for one human decision.");ledgerCall("evaluatePolicy","publish","listing-pack");requestApproval()}}
];
const verifyTimeline=[
 {at:207000,run(){event("relay","Listings published","OLX and Otodom live; portal IDs returned.","green");agent("relay","working","publishing OLX, Otodom","publish");addPublished("OLX","olx-8432112");addPublished("Otodom","otodom-88910")}},
 {at:217000,run(){event("relay","Listings published","Morizon and Gratka live; portal IDs returned.","green");agent("relay","working","publishing Morizon, Gratka","publish");addPublished("Morizon","morizon-11042");addPublished("Gratka","gratka-990211")}},
 {at:227000,run(){event("relay","Listings published","Domiporta and Nieruchomosci.pl live.","green");agent("relay","working","publishing last two portals","publish");addPublished("Domiporta","domiporta-4051");addPublished("Nieruchomosci.pl","nieruch-66190")}},
 {at:238000,run(){event("warden","Verification started","Checking live presence of 6 listings across all portals.","cyan");agent("relay","complete","all 6 listings published","publish");agent("warden","working","verifying live listings","verify");stage("verify",62,"Verifying published listings","Warden is confirming every ad is live and collecting its public URL.")}},
 {at:251000,run(){event("warden","Listings confirmed","OLX and Otodom show the ad with the correct selling title.","green");agent("warden","reviewing","confirmed 2 portals","verify")}},
 {at:264000,run(){event("warden","All 6 listings verified","Every portal shows the published ad.","green");agent("warden","reviewing","verified 6/6 portals","monitor")}},
 {at:276000,run(){event("warden","Published links compiled","6 live URLs collected into the release packet.","green");agent("warden","complete","compiling link list","verify");sealArtifact({baseId:"published-urls",type:"published_urls",label:"PUBLISHED LINKS",createdBy:"warden",parentIds:["listing-pack"],payload:{links:state.publishedUrls.length,portals:state.publishedUrls.map(p=>p.portal)}});renderLinks()}},
 {at:288000,run(){event("helm","Mission completed","RE-042 closed: 6 listings live and verified on all portals.","green");completeMission()}}
];
function renderRoster(){
 $("#agentRoster").innerHTML=agents.map(a=>'<article class="agent-card '+(state.selected===a.id?"selected":"")+'" data-id="'+a.id+'" title="'+escapeHtml(a.role)+' — '+escapeHtml(a.task)+'" style="--agent:'+a.color+'"><div class="avatar">'+a.letter+'</div><div class="agent-head"><b>'+a.name.toUpperCase()+'</b><span>'+a.state+'</span></div><div class="agent-role">'+a.role+'</div><div class="agent-task"><i></i>'+a.task+'</div></article>').join("");
 document.querySelectorAll(".agent-card").forEach(n=>n.onclick=()=>select(n.dataset.id));
}
function select(id){
 state.selected=id; renderRoster();
 const a=agents.find(x=>x.id===id), box=$("#selection");
 box.querySelector("span").textContent="SELECTED AGENT · "+a.state.toUpperCase();
 box.querySelector("b").textContent=a.name.toUpperCase();
 box.querySelector("p").textContent=a.task+". Current zone: "+zoneName(a.zone)+".";
 box.style.borderColor=a.color; box.querySelector("span").style.color=a.color;
}
function zoneName(id){const special={core:"Transit Core",monitor:"Floor Monitor",photo:"Photo Booth",draft:"Draft Printer",lounge:"Decision Lounge",server:"Server Rack"};if(special[id])return special[id];const z=zones.find(x=>x.id===id);return z?z.name:id}
function navigate(a,x,y){
 const path=[];
 if(a.y>320){path.push({x:a.x,y:292})}
 else if(a.y<300&&a.y>0&&(y>320||y<160)){path.push({x:a.x,y:292})}
 if(y>320){path.push({x,y:292},{x,y})}
 else if(y<160){path.push({x,y:292},{x,y})}
 else{path.push({x,y})}
 path.push({x,y});a.path=path.filter((p,i,list)=>!i||p.x!==list[i-1].x||p.y!==list[i-1].y);const next=a.path.shift();a.tx=next.x;a.ty=next.y;
}
function agent(id,status,task,zone){
 const a=agents.find(x=>x.id===id); if(!a)return;
 a.state=status;a.task=task;a.activity=task;a.returnAt=0;
 if(zone&&points[zone]){a.zone=zone;const offsets={helm:-72,scout:-36,forge:-2,archive:-58,sentinel:22,relay:56,warden:84},x=points[zone].x+(zone==="core"?offsets[id]||0:0),y=points[zone].y+(zone==="core"&&(id==="scout"||id==="archive"||id==="relay"||id==="warden")?10:0);navigate(a,x,y);burst(a.x,a.y,a.color,6)}
 renderRoster();if(state.selected===id)select(id);
}
function event(actor,title,message,tone){
 const colors={cyan:C.cyan,green:C.green,amber:C.amber,red:C.red,violet:C.sentinel,pink:C.warden};
 const el=document.createElement("article"),time=new Intl.DateTimeFormat("en-GB",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(new Date());
 el.className="event";el.style.setProperty("--tone",colors[tone]||C.cyan);
 el.innerHTML='<i></i><div><b>'+actor+'</b><time>'+time+'</time></div><p><strong>'+title+'.</strong> '+message+'</p>';
 $("#eventFeed").prepend(el);state.count++;$("#eventCount").textContent=String(state.count).padStart(2,"0")+" EVENTS";
 if(bridge)bridge.recordEvent({missionId:"RE-042",actor,title,message,tone});
}
function resetComms(){
 commSignals.length=0;commSequence=0;const items=$("#commItems");if(items)items.innerHTML='<article class="comm-empty"><i></i><p>Encrypted handoff channels standing by.</p></article>';if($("#commBus"))$("#commBus").textContent="BUS READY";
}
function sendComm(fromId,toId,message,channel="handoff",duration=11000){
 const from=agents.find(a=>a.id===fromId),to=agents.find(a=>a.id===toId);if(!from||!to)return;
 const signal={id:++commSequence,fromId,toId,message,channel,color:from.color,born:performance.now(),duration};commSignals.push(signal);if(commSignals.length>8)commSignals.shift();
 const items=$("#commItems"),row=document.createElement("article"),stamp="T+"+formatDuration(state.elapsed);row.className="comm-message";row.style.setProperty("--comm",from.color);row.innerHTML='<div><strong>'+escapeHtml(from.name.toUpperCase()+" → "+to.name.toUpperCase())+'</strong><time>'+stamp+'</time></div><p><em>'+escapeHtml(channel)+'</em>'+escapeHtml(message)+'</p>';if(items.querySelector(".comm-empty"))items.innerHTML="";items.prepend(row);while(items.children.length>3)items.lastElementChild.remove();$("#commBus").textContent=String(commSequence).padStart(2,"0")+" ROUTED";burst(from.x,from.y,from.color,10);burst(to.x,to.y,to.color,6);
}
function ledgerCall(method,...args){if(!ledger||typeof ledger[method]!=="function")return Promise.resolve(null);return ledger[method](...args).catch(error=>{event("ledger","Ledger warning",error.message,"red");return null})}
function sealArtifact(spec){return ledgerCall("createArtifact",spec)}
function artifactColor(artifact){return C[artifact.createdBy]||C.cyan}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]))}
function launchArtifactPacket(artifact){
 const source=agents.find(a=>a.id===artifact.createdBy)||agents[0],targets={intake:"scout",portal_credentials:"forge",media:"forge",seo_title:"archive",listing_variants:"archive",listing_pack:"sentinel",compliance_report:"relay",published_urls:"relay"},target=agents.find(a=>a.id===targets[artifact.type])||agents.find(a=>a.id==="archive");
 artifactPackets.push({artifactId:artifact.artifactId,label:artifact.label||artifact.baseId,color:artifactColor(artifact),x1:source.x,y1:source.y-18,x2:target.x,y2:target.y-18,born:performance.now(),duration:4300});
}
function showArtifact(artifactId){
 if(!ledger)return;const snapshot=ledger.snapshot(),artifact=snapshot.artifacts.find(item=>item.artifactId===artifactId);if(!artifact)return;selectedArtifactId=artifactId;
 const parents=artifact.parentIds.length?artifact.parentIds.join(" → "):"GENESIS",audit=artifact.audit&&artifact.audit.status==="passed"?"PASSED · "+artifact.audit.checks+" checks":"NOT ATTACHED";
 $("#ledgerDetail").innerHTML='<span>ARTIFACT PASSPORT</span><b>'+escapeHtml(artifact.label)+' · v'+artifact.version+'</b><p>Created by '+escapeHtml(artifact.createdBy.toUpperCase())+' · '+escapeHtml(artifact.type)+'<br>Parents: '+escapeHtml(parents)+'<br>Audit: '+escapeHtml(audit)+'</p><code>SHA-256 '+escapeHtml(artifact.hash)+'</code>';
 document.querySelectorAll(".ledger-card").forEach(card=>card.classList.toggle("selected",card.dataset.artifact===artifactId));
}
function showLedgerToast(eyebrow,title,meta,tone=""){
 const toast=$("#ledgerToast");if(!toast)return;clearTimeout(ledgerToastTimer);toast.hidden=true;toast.className="ledger-toast"+(tone?" "+tone:"");$("#ledgerToastEyebrow").textContent=eyebrow;$("#ledgerToastTitle").textContent=title;$("#ledgerToastMeta").textContent=meta;void toast.offsetWidth;toast.hidden=false;ledgerToastTimer=setTimeout(()=>toast.hidden=true,3600);
}
function updateFlowNode(id,st,label){
 const node=document.querySelector('[data-flow="'+id+'"]'),value=$("#flow"+id[0].toUpperCase()+id.slice(1));if(!node||!value)return;node.className=st==="locked"?"":st;value.textContent=label;
}
function updateArtifactFlow(snapshot,stale){
 const artifacts=snapshot.artifacts,brief=artifacts.find(a=>a.baseId==="seller-brief"),creds=artifacts.find(a=>a.baseId==="portal-accounts"),variants=artifacts.find(a=>a.baseId==="listing-variants"),pack=artifacts.filter(a=>a.baseId==="listing-pack").sort((a,b)=>b.version-a.version)[0],urls=artifacts.find(a=>a.baseId==="published-urls"),auditCurrent=!!(pack&&pack.audit&&pack.audit.status==="passed"&&pack.audit.artifactHash===pack.hash),policy=snapshot.policy;
 updateFlowNode("intake",brief?"done":snapshot.missionId?"active":"locked",brief?"SELLER PARSED":snapshot.missionId?"READING":"WAITING");
 updateFlowNode("register",creds?"done":brief?"active":"locked",creds?"ACCOUNTS READY":brief?"REGISTERING":"LOCKED");
 updateFlowNode("content",variants?"done":brief?"active":"locked",variants?variants.payload.variants+" WRITTEN":brief?"SEO+WRITING":"LOCKED");
 updateFlowNode("compliance",stale?"stale":auditCurrent?"done":pack?"active":"locked",stale?"STALE":auditCurrent?pack.audit.checks+"/6 PASS":pack?"PENDING":"LOCKED");
 updateFlowNode("publish",urls?"done":policy?(policy.decision==="blocked"?"stale":policy.decision==="approval_required"?"waiting":policy.decision==="approved"?"done":"active"):auditCurrent?"active":"locked",urls?"PUBLISHED":policy?policy.decision==="blocked"?"BLOCKED":policy.decision==="approval_required"?"APPROVAL":policy.decision==="approved"?"PUBLISHED":"CHECKING":auditCurrent?"READY":"LOCKED");
 updateFlowNode("verify",urls?"done":policy&&policy.decision==="approved"?"active":"locked",urls?urls.payload.links+" LINKS":policy&&policy.decision==="approved"?"VERIFYING":"LOCKED");
}
function renderLedger(snapshot){
 if(!snapshot)return;const artifacts=snapshot.artifacts.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),latestPack=artifacts.filter(a=>a.baseId==="listing-pack").sort((a,b)=>b.version-a.version)[0],oldAudit=artifacts.some(a=>a.baseId==="listing-pack"&&a.audit&&a.audit.status==="passed"),stale=!!(latestPack&&oldAudit&&(!latestPack.audit||latestPack.audit.artifactHash!==latestPack.hash));
 const mini=$("#ledgerMini"),integrity=snapshot.integrity==="compromised"?"CHAIN BROKEN":stale?"AUDIT STALE":snapshot.integrity==="verified"?"CHAIN VERIFIED":"CHAIN ACTIVE";
 mini.classList.toggle("stale",stale);mini.classList.toggle("compromised",snapshot.integrity==="compromised");$("#ledgerCount").textContent=artifacts.length+" ARTIFACT"+(artifacts.length===1?"":"S");$("#ledgerIntegrity").textContent=integrity;
 updateArtifactFlow(snapshot,stale);
 $("#ledgerEvents").textContent=snapshot.events.length;$("#ledgerArtifacts").textContent=artifacts.length;$("#ledgerChain").textContent=snapshot.integrity.toUpperCase();
 const policy=snapshot.policy,policyNode=$("#ledgerPolicy");policyNode.textContent=policy?policy.decision.replaceAll("_"," ").toUpperCase():"POLICY IDLE";policyNode.className=policy?(policy.decision==="blocked"?"blocked":policy.decision==="approval_required"?"waiting":"pass"):"";
 $("#ledgerItems").innerHTML=artifacts.length?artifacts.map(artifact=>'<button class="ledger-card'+(artifact.artifactId===selectedArtifactId?" selected":"")+'" data-artifact="'+escapeHtml(artifact.artifactId)+'" style="--artifact:'+artifactColor(artifact)+'"><strong>'+escapeHtml(artifact.label)+'<em>v'+artifact.version+'</em></strong><small>'+escapeHtml(artifact.createdBy.toUpperCase())+' · '+escapeHtml(artifact.parentIds.length+" PARENTS")+'</small><code>'+escapeHtml(artifact.hash.slice(0,16))+'…</code></button>').join(""):'<div class="ledger-detail"><span>LEDGER EMPTY</span><p>Start the mission to create the first cryptographically sealed artifact.</p></div>';
 document.querySelectorAll(".ledger-card").forEach(card=>card.onclick=()=>showArtifact(card.dataset.artifact));
 if(selectedArtifactId&&!artifacts.some(a=>a.artifactId===selectedArtifactId))selectedArtifactId=null;
}
function bindLedger(){
 if(!ledger)return;
 ledger.addEventListener("change",e=>renderLedger(e.detail));
 ledger.addEventListener("artifact",e=>{launchArtifactPacket(e.detail);renderLedger(ledger.snapshot());showLedgerToast("ARTIFACT SEALED",e.detail.label+" · v"+e.detail.version,"SHA-256 "+e.detail.hash.slice(0,12)+"… · "+e.detail.createdBy.toUpperCase()+" → LEDGER");event("ledger","Artifact sealed",e.detail.label+" v"+e.detail.version+" · sha256 "+e.detail.hash.slice(0,10)+"…","cyan")});
 ledger.addEventListener("audit",e=>{renderLedger(ledger.snapshot());showLedgerToast("AUDIT BOUND TO CURRENT HASH",e.detail.artifact.label+" · "+e.detail.artifact.audit.checks+"/6 CHECKS","SENTINEL VERIFIED "+e.detail.artifact.hash.slice(0,12)+"…","pass");event("sentinel","Cryptographic audit attached",e.detail.artifact.artifactId+" is bound to its current SHA-256 hash.","green")});
 ledger.addEventListener("audit-stale",e=>{renderLedger(ledger.snapshot());showLedgerToast("AUDIT STALE",e.detail.artifact.label+" CHANGED AFTER REVIEW","RELEASE BLOCKED · RE-AUDIT REQUIRED","stale");event("ledger","Audit invalidated",e.detail.artifact.artifactId+" changed after review and must be audited again.","red")});
 ledger.addEventListener("policy",e=>{renderLedger(ledger.snapshot());showLedgerToast("RELEASE POLICY EVALUATED",e.detail.decision.replaceAll("_"," ").toUpperCase(),e.detail.decision==="approval_required"?"LINEAGE + CURRENT AUDIT VERIFIED · WAITING FOR HUMAN":"POLICY CHECKS RECORDED",e.detail.decision==="blocked"?"stale":e.detail.decision==="approval_required"?"waiting":"pass");event("policy","Release policy evaluated",e.detail.decision.replaceAll("_"," ")+" · audit and lineage checks recorded.","amber")});
 renderLedger(ledger.snapshot());
 $("#ledgerMini").onclick=()=>{const drawer=$("#ledgerDrawer");drawer.hidden=false;$("#ledgerMini").hidden=true;const latest=ledger.snapshot().artifacts.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];if(latest)showArtifact(latest.artifactId)};
 $("#closeLedger").onclick=()=>{$("#ledgerDrawer").hidden=true;$("#ledgerMini").hidden=false};
}
function renderMissionInput(){
 const m=state.mission;
 $("#sumSeller").textContent=m.seller.name+" · "+m.seller.phone;
 $("#sumPortals").textContent=m.portals.length+" PORTALS";
 $("#sumMandatory").textContent=m.mandatory.length+" MANDATORY FIELDS";
 $("#portalMetric").textContent=String(m.portals.length).padStart(2,"0");
 $("#missionTitle").textContent="Publish "+m.seller.name.split(" ")[0]+"'s property on "+m.portals.length+" portals";
 $("#missionSub").textContent="Register accounts, write SEO listings, audit, publish, and verify live links.";
}
function loadSetupForm(){
 const m=state.mission;
 $("#inSeller").value=m.seller.name;$("#inPhone").value=m.seller.phone;$("#inPhoto").value=m.seller.photo;$("#inVideo").value=m.seller.video;$("#inDescription").value=m.seller.description;
 $("#inPortals").value=m.portals.join("\n");
 const creds=Object.keys(m.credentials).map(p=>p+" | "+m.credentials[p].login+" | "+m.credentials[p].password).join("\n");
 $("#inCreds").value=creds;
 $("#inMandatory").value=m.mandatory.map(x=>x.label+" = "+x.value).join("\n");
}
function saveSetupForm(){
 const m=state.mission;
 m.seller={name:$("#inSeller").value.trim(),phone:$("#inPhone").value.trim(),photo:$("#inPhoto").value.trim(),description:$("#inDescription").value.trim(),video:$("#inVideo").value.trim()};
 m.portals=$("#inPortals").value.split(/\n+/).map(s=>s.trim()).filter(Boolean);
 if(!m.portals.length)m.portals=DEFAULT_MISSION.portals.slice();
 const creds={};
 $("#inCreds").value.split(/\n+/).forEach(line=>{const parts=line.split("|").map(s=>s.trim());if(parts.length>=2&&parts[0])creds[parts[0]]={login:parts[1],password:parts[2]||""}});
 m.credentials=creds;
 m.mandatory=$("#inMandatory").value.split(/\n+/).map(line=>{const i=line.indexOf("=");if(i<0)return null;return{label:line.slice(0,i).trim(),value:line.slice(i+1).trim()}}).filter(Boolean);
 m.seoTitle=generateSeoTitle();
 saveInput();renderMissionInput();
 event("system","Mission input saved","Seller brief, portal accounts, and mandatory fields loaded from your input.","green");
}
function renderLinks(){
 const panel=$("#linkPanel"),list=$("#linkItems");if(!list)return;
 if(!state.publishedUrls.length){if(panel)panel.hidden=true;return}
 if(panel)panel.hidden=false;
 $("#linkCount").textContent=state.publishedUrls.length+" LINKS";
 list.innerHTML=state.publishedUrls.map(l=>'<a class="link-row" style="--l:'+C[l.agent]+'" href="'+escapeHtml(l.url)+'" target="_blank" rel="noreferrer"><span>'+escapeHtml(l.portal)+'</span><b>'+escapeHtml(l.id)+'</b><em>'+escapeHtml(l.url)+'</em></a>').join("");
}
function addPublished(portal,id){
 state.publishedUrls.push({portal,id,url:"https://"+portal.toLowerCase().replace(/[^a-z]/g,"")+".example/"+id,agent:"warden"});
 renderLinks();
}
async function ledgerShowcase(){
 if(!ledger)return;await ledger.startMission("RE-042");
 await ledger.createArtifact({baseId:"seller-brief",type:"intake",label:"SELLER BRIEF",createdBy:"helm",payload:{name:state.mission.seller.name,phone:"masked",portals:state.mission.portals.length}});
 await ledger.createArtifact({baseId:"media-pack",type:"media",label:"MEDIA PACK",createdBy:"scout",parentIds:["seller-brief"],payload:{photo:true,video:true}});
 await ledger.createArtifact({baseId:"portal-accounts",type:"portal_credentials",label:"PORTAL ACCOUNTS",createdBy:"archive",parentIds:["seller-brief"],payload:{registered:6}});
 await ledger.createArtifact({baseId:"seo-title",type:"seo_title",label:"SEO SELLING TITLE",createdBy:"forge",parentIds:["media-pack"],payload:{title:state.mission.seoTitle}});
 await ledger.createArtifact({baseId:"listing-variants",type:"listing_variants",label:"6 LISTING VARIANTS",createdBy:"forge",parentIds:["seo-title","portal-accounts"],payload:{variants:6}});
 await ledger.createArtifact({baseId:"listing-pack",type:"listing_pack",label:"LISTING PACK",createdBy:"forge",parentIds:["listing-variants","portal-accounts"],payload:{variants:6}});
 await ledger.auditArtifact("listing-pack","sentinel",6);await ledger.createArtifact({baseId:"compliance-report",type:"compliance_report",label:"COMPLIANCE 6/6",createdBy:"sentinel",parentIds:["listing-pack"],payload:{checks:6,verdict:"pass"}});await ledger.evaluatePolicy("publish","listing-pack");
 await ledger.createArtifact({baseId:"published-urls",type:"published_urls",label:"PUBLISHED LINKS",createdBy:"warden",parentIds:["listing-pack"],payload:{links:6}});
 $("#ledgerDrawer").hidden=false;$("#ledgerMini").hidden=true;showArtifact(ledger.latest("listing-pack").artifactId);
}
function formatDuration(ms){const total=Math.max(0,Math.ceil(ms/1000)),m=Math.floor(total/60),s=total%60;return String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")}
function stage(name,progress,title,sub){
 $("#progressBar").style.width=progress+"%";$("#progressLabel").textContent=progress===100?"100% · COMPLETE":progress+"% · "+formatDuration(state.duration-state.elapsed)+" left";$("#missionTitle").textContent=title;$("#missionSub").textContent=sub;
 const current=stages.indexOf(name);document.querySelectorAll("#stages span").forEach((n,i)=>{n.classList.toggle("active",i===current);n.classList.toggle("done",i<current)});
}
function requestApproval(){
 state.approval=true;state.running=false;$("#approvalIdle").hidden=true;$("#approvalRequest").hidden=false;
 $("#airlockMetric").textContent="01 WAITING";$("#airlockMetric").style.color=C.red;$("#riskBadge").textContent="APPROVAL HOLD";$("#riskBadge").style.color=C.red;burst(points.publish.x,points.publish.y,C.red,28);
 if(bridge)bridge.requestApproval({missionId:"RE-042",agent:"relay",action:"publish "+state.mission.portals.length+" real-estate listings",reversible:true});
}
function resolve(ok){
 if(!state.approval)return;state.approval=false;$("#approvalIdle").hidden=false;$("#approvalRequest").hidden=true;$("#airlockMetric").textContent="CLEAR";$("#airlockMetric").style.color="";
 if(bridge)bridge.resolveApproval(ok?"approved":"rejected");
 ledgerCall("recordApproval",ok?"approved":"rejected");
 if(ok){
  event("operator","Listing publication approved","6 listings pushed through the Approval Airlock to the portals.","green");
  agent("relay","working","publishing 6 listings","publish");agent("helm","working","supervising publication","command");
  state.mode="verify";state.verifyCursor=0;state.publishedUrls=[];renderLinks();
  state.running=true;state.spend=1.42;$("#spendMetric").textContent="$1.42";
 }else{
  state.rejected=true;event("operator","Listing publication rejected","Publication blocked; all listing variants remain in the Vault for revision.","red");agent("relay","idle","publication cancelled","publish");agent("helm","working","revising release plan","command");agent("forge","working","preparing private revisions","writing");stage("content",48,"Returned for revision","The publication was rejected; the audited pack remains intact.");$("#riskBadge").textContent="REVISION";$("#riskBadge").style.color=C.amber;
 }
}
function completeMission(){
 state.complete=true;state.running=false;state.mode="done";
 $("#riskBadge").textContent="COMPLETED";$("#riskBadge").style.color=C.green;
 state.spend=2.14;$("#spendMetric").textContent="$2.14";
 $("#portalMetric").textContent=state.publishedUrls.length+"/"+state.mission.portals.length;
 stage("verify",100,"Mission complete","All listings are live and verified; published links compiled.");
 renderLinks();burst(points.command.x,points.command.y,C.green,24);
}
function start(){
 if(state.complete||state.rejected||state.cursor>=timeline.length)reset(false);if(state.approval)return;
 if(state.elapsed===0){artifactPackets.length=0;selectedArtifactId=null;resetComms();ledgerCall("startMission","RE-042")}
 state.running=true;state.paused=false;$("#startBtn").textContent="● Listing running";event("system","System started","Estate Ops $Publish event loop is active.","cyan");
 if(bridge)bridge.startMission({id:"RE-042",objective:"Publish the seller listing on "+state.mission.portals.length+" portals",agents:agents.map(a=>a.id)}).then(ack=>event("grok","Command acknowledged","mission.start accepted as #"+ack.sequence+" in "+ack.latency+"ms.","green")).catch(()=>event("grok","Transport warning","Mission continues locally; command acknowledgement was not received.","amber"));
}
function pause(){
 if(state.approval||state.complete)return;state.paused=!state.paused;state.running=!state.paused;$("#pauseBtn").textContent=state.paused?"▶":"Ⅱ";event("system",state.paused?"System paused":"System resumed",state.paused?"Timeline execution is holding.":"Timeline execution continues.","amber");
 if(bridge)bridge.setMissionState(state.paused?"paused":"running");
}
function reset(announce=true){
 state.running=false;state.paused=false;state.approval=false;state.complete=false;state.rejected=false;state.elapsed=0;state.cursor=0;state.verifyCursor=0;state.artifacts=0;state.spend=0;state.mode="mission";state.publishedUrls=[];renderLinks();agents=initial.map(a=>({...a}));resetComms();
 $("#approvalIdle").hidden=false;$("#approvalRequest").hidden=true;$("#airlockMetric").textContent="CLEAR";$("#airlockMetric").style.color="";$("#spendMetric").textContent="$0.00";$("#portalMetric").textContent=String(state.mission.portals.length).padStart(2,"0");$("#riskBadge").textContent="LOW RISK";$("#riskBadge").style.color="";$("#startBtn").textContent="▶ Start listing";$("#pauseBtn").textContent="Ⅱ";
 stage(null,0,"Publish "+state.mission.seller.name.split(" ")[0]+"'s property on "+state.mission.portals.length+" portals","Register accounts, write SEO listings, audit, publish, and verify live links.");document.querySelectorAll("#stages span").forEach(n=>n.classList.remove("active","done"));renderRoster();select("helm");if(announce)event("system","Mission reset","All agents returned to their stations; the six-minute clock is ready.","amber");
 if(bridge&&announce)bridge.resetMission();
 if(ledger&&announce){artifactPackets.length=0;selectedArtifactId=null;ledgerCall("startMission","RE-042")}
}
function burst(x,y,color,count){for(let i=0;i<count;i++)state.particles.push({x,y,color,life:1,dx:(Math.random()-.5)*2.8,dy:(Math.random()-.5)*2.8})}
function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,r.width*d);canvas.height=Math.max(1,r.height*d);ctx.setTransform(d,0,0,d,0,0);ctx.imageSmoothingEnabled=false}
function transform(){const w=canvas.clientWidth,h=canvas.clientHeight,s=Math.min(w/900,h/540);return{s,ox:(w-900*s)/2,oy:(h-540*s)/2}}
function panel(x,y,w,h,fill,stroke){const q=9;ctx.beginPath();ctx.moveTo(x+q,y);ctx.lineTo(x+w-q,y);ctx.lineTo(x+w,y+q);ctx.lineTo(x+w,y+h-q);ctx.lineTo(x+w-q,y+h);ctx.lineTo(x+q,y+h);ctx.lineTo(x,y+h-q);ctx.lineTo(x,y+q);ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke()}
function backdrop(){
 ctx.fillStyle="#070c11";ctx.fillRect(0,0,900,540);ctx.strokeStyle="#577c8b16";ctx.lineWidth=1;
 for(let x=20;x<900;x+=20){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,540);ctx.stroke()}for(let y=20;y<540;y+=20){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(900,y);ctx.stroke()}
 for(let i=0;i<80;i++){const x=i*137%900,y=i*83%540;ctx.fillStyle=i%7?"#ffffff0b":"#8b928b24";ctx.fillRect(x,y,i%7?1:2,i%7?1:2)}
}
function connectors(){
 const p=points.core;ctx.lineWidth=8;ctx.strokeStyle="#101923";
 zones.forEach(z=>{const q=points[z.id];ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke()});
 ctx.lineWidth=1;ctx.setLineDash([3,9]);ctx.strokeStyle="#747a7430";zones.forEach(z=>{const q=points[z.id];ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke()});ctx.setLineDash([]);
}
function drawZone(z){
 const active=agents.some(a=>a.zone===z.id&&a.state!=="idle");panel(z.x,z.y,z.w,z.h,active?"#101110f7":"#0a0b0af2",active?z.color:"#303230");
 ctx.fillStyle=active?z.color:"#53616b";ctx.font="bold 10px monospace";ctx.fillText(z.name,z.x+13,z.y+20);ctx.fillStyle=active?z.color:"#27343e";ctx.fillRect(z.x+12,z.y+29,z.w-24,2);
 details(z,active);ctx.fillStyle=active?z.color:"#3a4853";for(let i=0;i<3;i++)ctx.fillRect(z.x+z.w-18-i*8,z.y+14,4,4);
}
function details(z,active){
 if(z.type==="bridge"){ctx.fillStyle="#172530";ctx.fillRect(z.x+22,z.y+52,72,35);ctx.fillRect(z.x+126,z.y+52,72,35);ctx.fillStyle="#284858";ctx.fillRect(z.x+27,z.y+57,62,18);ctx.fillRect(z.x+131,z.y+57,62,18);ctx.fillStyle=C.helm;ctx.fillRect(z.x+34,z.y+62,24,3);ctx.fillRect(z.x+138,z.y+62,42,3);ctx.fillStyle="#19222a";ctx.fillRect(z.x+35,z.y+105,150,18)}
 if(z.type==="build"){for(let i=0;i<3;i++){ctx.fillStyle="#182832";ctx.fillRect(z.x+24+i*67,z.y+48,48,54);ctx.fillStyle=i===1?C.cyan:"#2d5363";ctx.fillRect(z.x+29+i*67,z.y+54,38,22);ctx.fillStyle="#7ee8dc";ctx.fillRect(z.x+33+i*67,z.y+59,19,3)}ctx.fillStyle="#1c2e38";ctx.fillRect(z.x+44,z.y+116,143,12)}
 if(z.type==="audit"){ctx.strokeStyle="#4f406c";ctx.lineWidth=4;ctx.strokeRect(z.x+22,z.y+48,166,64);ctx.fillStyle="#161d2a";ctx.fillRect(z.x+28,z.y+54,154,52);[46,88,66,112,92].forEach((w,i)=>{ctx.fillStyle=C.sentinel;ctx.fillRect(z.x+38,z.y+61+i*8,w,2)})}
 if(z.type==="skill"){ctx.fillStyle="#2b2418";ctx.fillRect(z.x+22,z.y+49,176,71);ctx.fillStyle=C.amber;ctx.fillRect(z.x+32,z.y+61,38,38);ctx.fillStyle="#0d1115";ctx.fillRect(z.x+38,z.y+67,26,26);for(let i=0;i<4;i++){ctx.fillStyle=i%2?C.orange:"#66502a";ctx.fillRect(z.x+92+i*23,z.y+67,13,30)}}
 if(z.type==="vault"){ctx.fillStyle="#13271f";ctx.fillRect(z.x+37,z.y+45,156,79);ctx.strokeStyle="#315e48";ctx.lineWidth=3;ctx.strokeRect(z.x+43,z.y+51,144,67);for(let i=0;i<6;i++){ctx.fillStyle=i<Math.max(2,state.artifacts+1)?C.green:"#284237";ctx.fillRect(z.x+55+i*21,z.y+67,10,32)}}
 if(z.type==="airlock"){const x=z.x+z.w/2,y=z.y+84;ctx.strokeStyle=state.approval?C.red:active?z.color:"#3b3940";ctx.lineWidth=7;ctx.beginPath();ctx.arc(x,y,40,0,Math.PI*2);ctx.stroke();ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,27,0,Math.PI*2);ctx.stroke();ctx.fillStyle=state.approval?C.red:"#29313a";ctx.fillRect(x-3,y-30,6,60);ctx.fillRect(x-30,y-3,60,6)}
 if(z.type==="verify"){ctx.fillStyle="#231f2e";ctx.fillRect(z.x+22,z.y+48,166,64);ctx.strokeStyle="#5a4b6e";ctx.lineWidth=2;ctx.strokeRect(z.x+28,z.y+54,154,52);for(let i=0;i<5;i++){ctx.fillStyle="#383243";ctx.fillRect(z.x+38,z.y+60+i*9,36,5);ctx.fillStyle=active?C.green:"#5a6a55";ctx.fillRect(z.x+78,z.y+61+i*9,5,4)}}
}
function core(){
 const p=points.core,pulse=5+Math.sin(performance.now()/350)*2;ctx.fillStyle="#4ee7e20f";ctx.beginPath();ctx.arc(p.x,p.y,64+pulse,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#24424b";ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,48,0,Math.PI*2);ctx.stroke();ctx.setLineDash([3,6]);ctx.strokeStyle=C.cyan;ctx.beginPath();ctx.arc(p.x,p.y,36,performance.now()/1200,performance.now()/1200+Math.PI*1.5);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle="#0d171d";ctx.beginPath();ctx.arc(p.x,p.y,25,0,Math.PI*2);ctx.fill();ctx.fillStyle=C.cyan;ctx.font="bold 8px monospace";ctx.textAlign="center";ctx.fillText("EVENT",p.x,p.y-2);ctx.fillText("CORE",p.x,p.y+10);ctx.textAlign="left";
}
function room(){
 ctx.fillStyle="#0b0b0a";ctx.fillRect(0,0,900,540);
 ctx.fillStyle="#12110f";ctx.fillRect(0,0,900,108);ctx.fillStyle="#2b2118";ctx.fillRect(0,101,900,8);
 ctx.strokeStyle="#241e18";ctx.lineWidth=1;for(let y=109;y<540;y+=22){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(900,y);ctx.stroke()}for(let x=0;x<900;x+=70){ctx.beginPath();ctx.moveTo(x,109);ctx.lineTo(x+25,540);ctx.stroke()}
 drawWindow(24,18,142,58);drawWindow(180,18,142,58);drawWallMonitor(345,16,250,67);drawClock(746,45);
 ctx.fillStyle="#080908";ctx.fillRect(0,88,900,13);ctx.fillStyle="#77736a";ctx.font="bold 7px monospace";ctx.fillText("ESTATE OPS $PUBLISH · ONE HUMAN · SEVEN BOTS · FLOOR STATUS: NOMINAL",25,97);
 [165,455,740].forEach(x=>{ctx.fillStyle="#d7c28b10";ctx.beginPath();ctx.moveTo(x-13,109);ctx.lineTo(x-82,320);ctx.lineTo(x+82,320);ctx.closePath();ctx.fill();ctx.fillStyle="#6c5c3b";ctx.fillRect(x-17,106,34,5)});
 ctx.fillStyle="#15130f";ctx.fillRect(280,260,350,65);ctx.strokeStyle="#37312a";ctx.strokeRect(280,260,350,65);
 ctx.fillStyle="#746958";ctx.font="bold 8px monospace";ctx.fillText("COMMON HANDOFF FLOOR",290,274);
}
function drawWindow(x,y,w,h){const now=performance.now();ctx.fillStyle="#080b0e";ctx.fillRect(x,y,w,h);ctx.strokeStyle="#292b2a";ctx.strokeRect(x,y,w,h);ctx.fillStyle="#d8d8d0";ctx.beginPath();ctx.arc(x+w-24,y+18,8,0,Math.PI*2);ctx.fill();for(let i=0;i<24;i++){const bx=x+6+(i*37%(w-12)),bh=5+(i*11%23),lit=Math.sin(now/650+i*2.7)>.22;ctx.fillStyle=lit?(i%4?"#73794b":"#a99c55"):"#333724";ctx.fillRect(bx,y+h-bh-4,3,bh)}}
function drawWallMonitor(x,y,w,h){const now=performance.now(),phase=now/720;ctx.fillStyle="#080b0c";ctx.fillRect(x,y,w,h);ctx.strokeStyle="#292d2d";ctx.strokeRect(x,y,w,h);ctx.strokeStyle="#1e2928";ctx.lineWidth=1;for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(x+8,y+15+i*11);ctx.lineTo(x+w-8,y+15+i*11);ctx.stroke()}ctx.save();ctx.beginPath();ctx.rect(x+8,y+17,w-16,h-22);ctx.clip();ctx.strokeStyle="#6f9f82";ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<28;i++){const px=x+9+i*9-(now/70%9),py=y+43-Math.sin(i*.63+phase)*10-Math.sin(i*.19+phase*.45)*7;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.stroke();ctx.strokeStyle="#526f8d";ctx.lineWidth=1;ctx.beginPath();for(let i=0;i<28;i++){const px=x+9+i*9-(now/105%9),py=y+49-Math.cos(i*.48+phase*.72)*8;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.stroke();ctx.fillStyle="#a6cf58";ctx.fillRect(x+10+(now/9%(w-25)),y+21,2,38);ctx.restore();ctx.fillStyle="#696d68";ctx.font="7px monospace";ctx.fillText("FLOOR MONITOR / PUBLISH THROUGHPUT",x+10,y+13)}
function drawClock(x,y){const now=new Date(),seconds=now.getSeconds()+now.getMilliseconds()/1000,minutes=now.getMinutes()+seconds/60,hours=now.getHours()%12+minutes/60,hand=(angle,length,width,color)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.sin(angle)*length,y-Math.cos(angle)*length);ctx.stroke()};ctx.fillStyle="#d7d2b9";ctx.beginPath();ctx.arc(x,y,31,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#534936";ctx.lineWidth=6;ctx.stroke();ctx.fillStyle="#665d49";for(let i=0;i<12;i++){const a=i*Math.PI/6;ctx.fillRect(x+Math.sin(a)*23-1,y-Math.cos(a)*23-1,2,2)}hand(hours*Math.PI/6,15,3,"#332c20");hand(minutes*Math.PI/30,21,2,"#332c20");hand(seconds*Math.PI/30,23,1,C.red);ctx.fillStyle="#332c20";ctx.fillRect(x-2,y-2,4,4)}
function furniture(){
 zones.forEach(desk);meetingTable();serverRack(865,278);plant(40,290);plant(850,492);
 ctx.fillStyle="#233137";ctx.fillRect(292,285,18,35);ctx.fillStyle="#52646a";ctx.fillRect(295,279,12,8);
}
function desk(z){
 const p=points[z.id],x=p.x-z.w/2+16,y=p.y-76,w=z.w-32;
 ctx.fillStyle="#211b15";ctx.fillRect(x,y,w,55);ctx.strokeStyle="#493928";ctx.strokeRect(x,y,w,55);
 ctx.fillStyle="#4a3724";ctx.fillRect(x-5,y+38,w+10,9);ctx.fillStyle="#2c2118";ctx.fillRect(x,y+47,w,16);
 for(let i=0;i<5;i++){ctx.fillStyle=i%2?z.color:"#6b5740";ctx.fillRect(x+8+i*25,y+24-(i%3)*5,16,4+(i%3)*5)}
 ctx.fillStyle="#111719";ctx.fillRect(x+12,y-4,48,28);ctx.strokeStyle="#2c3738";ctx.strokeRect(x+12,y-4,48,28);ctx.fillStyle=z.color;ctx.fillRect(x+18,y+3,30,3);ctx.fillRect(x+18+(performance.now()/35%28),y+9,2,9);ctx.fillStyle=z.color+"88";ctx.fillRect(x+18,y+17,8+(performance.now()/120%21),2);
 ctx.fillStyle="#17130f";ctx.fillRect(x+w-54,y+5,42,25);ctx.fillStyle="#d0cbc0";ctx.fillRect(x+w-48,y+9,12,14);ctx.fillStyle="#8f8b82";ctx.fillRect(x+w-32,y+12,14,11);
 ctx.fillStyle="#080908";ctx.fillRect(p.x-45,p.y+20,90,14);ctx.fillStyle="#c4c4bd";ctx.font="bold 8px monospace";ctx.textAlign="center";ctx.fillText(z.name,p.x,p.y+30);ctx.textAlign="left";
}
function meetingTable(){
 const p=points.core;ctx.fillStyle="#191511";ctx.fillRect(p.x-82,p.y-33,164,62);ctx.strokeStyle="#51402e";ctx.strokeRect(p.x-82,p.y-33,164,62);ctx.fillStyle="#3b2c20";ctx.fillRect(p.x-72,p.y-23,144,42);
 ctx.fillStyle="#d3ccba";ctx.fillRect(p.x-22,p.y-17,18,25);ctx.fillStyle="#918b80";ctx.fillRect(p.x+4,p.y-13,22,21);
 ctx.fillStyle="#9f8b57";ctx.font="bold 7px monospace";ctx.textAlign="center";ctx.fillText("HANDOFF TABLE",p.x,p.y+20);ctx.textAlign="left";
}
function serverRack(x,y){ctx.fillStyle="#101415";ctx.fillRect(x-22,y,32,145);ctx.strokeStyle="#333b3b";ctx.strokeRect(x-22,y,32,145);for(let i=0;i<11;i++){ctx.fillStyle=i%3===0?C.green:"#263232";ctx.fillRect(x-16,y+8+i*12,4,3);ctx.fillStyle="#343b3c";ctx.fillRect(x-7,y+8+i*12,10,3)}}
function plant(x,y){ctx.fillStyle="#4a3524";ctx.fillRect(x-9,y+22,18,16);ctx.fillStyle="#314b32";ctx.fillRect(x-3,y,6,25);ctx.fillRect(x-14,y+4,12,6);ctx.fillRect(x+2,y+8,14,6);ctx.fillRect(x-10,y-5,9,8)}
function drawAgent(a){
 const x=Math.round(a.x),y=Math.round(a.y),moving=Math.hypot(a.tx-a.x,a.ty-a.y)>2,stride=moving?(Math.sin(performance.now()/95+a.x)>.0?2:-2):0;
 ctx.globalAlpha=.14;ctx.fillStyle=a.color;ctx.fillRect(x-18,y+20,36,4);ctx.globalAlpha=1;
 ctx.fillStyle=a.color;ctx.fillRect(x-9,y-20,18,3);ctx.fillRect(x-13,y-17,26,5);ctx.fillRect(x-16,y-12,32,24);
 ctx.fillRect(x-16+stride,y+12,7,8);ctx.fillRect(x-4,y+12,8,6);ctx.fillRect(x+9-stride,y+12,7,8);
 ctx.fillStyle="#101010";ctx.fillRect(x-9,y-8,5,7);ctx.fillRect(x+4,y-8,5,7);
 if(moving){ctx.globalAlpha=.4;ctx.fillStyle=a.color;for(let i=0;i<5;i++)ctx.fillRect(x-23-i*7,y+12+(i%2)*3,2,2);ctx.globalAlpha=1}
 const status=a.state==="waiting approval"?C.red:a.state==="complete"?C.green:a.state==="idle"?"#555":a.color;ctx.fillStyle=status;ctx.fillRect(x+16,y-19,5,5);
 ctx.fillStyle="#080808ed";ctx.fillRect(x-31,y+27,62,13);ctx.fillStyle="#e0e0da";ctx.font="bold 8px monospace";ctx.textAlign="center";ctx.fillText(a.name.toUpperCase(),x,y+36);
 if(a.state!=="idle"||a.activity){const raw=(a.activity||a.task).toLowerCase(),label=raw.length>27?raw.slice(0,26)+"…":raw;ctx.font="7px monospace";const bw=Math.min(128,ctx.measureText(label).width+14);ctx.fillStyle="#070807f2";ctx.fillRect(x-bw/2,y+42,bw,14);ctx.strokeStyle=a.color+"99";ctx.strokeRect(x-bw/2+.5,y+42.5,bw-1,13);ctx.fillStyle=a.color;ctx.fillText(label,x,y+52)}
 ctx.textAlign="left";
}
function particles(){state.particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,3,3);p.x+=p.dx;p.y+=p.dy;p.life-=.025});ctx.globalAlpha=1;state.particles=state.particles.filter(p=>p.life>0)}
function drawCommSignals(){
 const now=performance.now(),quad=(a,b,c,t)=>(1-t)*(1-t)*a+2*(1-t)*t*b+t*t*c;
 for(let i=commSignals.length-1;i>=0;i--){const signal=commSignals[i],age=(now-signal.born)/signal.duration;if(age>=1){commSignals.splice(i,1);continue}const from=agents.find(a=>a.id===signal.fromId),to=agents.find(a=>a.id===signal.toId);if(!from||!to)continue;
  const x1=from.x,y1=from.y-18,x2=to.x,y2=to.y-18,vertical=Math.abs(x2-x1)<120,cx=(x1+x2)/2+(vertical?(signal.id%2?58:-58):0),cy=Math.max(62,Math.min(y1,y2)-52-signal.id%3*8),alpha=Math.min(1,age/.08,Math.max(0,(1-age)/.18));
  ctx.globalAlpha=alpha*.42;ctx.strokeStyle="#000";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(x1,y1);ctx.quadraticCurveTo(cx,cy,x2,y2);ctx.stroke();ctx.globalAlpha=alpha*.18;ctx.strokeStyle=signal.color;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x1,y1);ctx.quadraticCurveTo(cx,cy,x2,y2);ctx.stroke();ctx.globalAlpha=alpha*.95;ctx.lineWidth=2.2;ctx.setLineDash([4,5]);ctx.beginPath();ctx.moveTo(x1,y1);ctx.quadraticCurveTo(cx,cy,x2,y2);ctx.stroke();ctx.setLineDash([]);
  for(let p=0;p<3;p++){const u=(now/1850+p/3+signal.id*.11)%1,px=quad(x1,cx,x2,u),py=quad(y1,cy,y2,u);ctx.globalAlpha=alpha*(p?0.72:1);ctx.fillStyle=signal.color;ctx.fillRect(px-4,py-4,8,8);ctx.fillStyle="#f0f1eb";ctx.fillRect(px-1,py-1,3,3)}
  const pulse=7+Math.sin(now/180+signal.id)*2;ctx.globalAlpha=alpha*.85;ctx.strokeStyle=signal.color;ctx.lineWidth=1;ctx.beginPath();ctx.arc(x1,y1,pulse,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(x2,y2,pulse,0,Math.PI*2);ctx.stroke();
  const lx=quad(x1,cx,x2,.5),ly=quad(y1,cy,y2,.5)-7,label=(from.name+" → "+to.name).toUpperCase();ctx.font="bold 8px monospace";const width=Math.min(124,ctx.measureText(label).width+16);ctx.globalAlpha=alpha;ctx.fillStyle="#070807f4";ctx.fillRect(lx-width/2,ly-10,width,17);ctx.strokeStyle=signal.color;ctx.strokeRect(lx-width/2+.5,ly-9.5,width-1,16);ctx.fillStyle=signal.color;ctx.textAlign="center";ctx.fillText(label,lx,ly+2);ctx.textAlign="left";ctx.globalAlpha=1;
 }
}
function drawArtifactPackets(){
 const now=performance.now();
 for(let i=artifactPackets.length-1;i>=0;i--){const packet=artifactPackets[i],t=Math.min(1,(now-packet.born)/packet.duration),ease=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2,x=packet.x1+(packet.x2-packet.x1)*ease,y=packet.y1+(packet.y2-packet.y1)*ease-Math.sin(t*Math.PI)*52,alpha=t>.82?(1-t)/.18:1;
  ctx.globalAlpha=Math.max(0,alpha);ctx.strokeStyle=packet.color+"88";ctx.setLineDash([2,6]);ctx.beginPath();ctx.moveTo(packet.x1,packet.y1);ctx.quadraticCurveTo((packet.x1+packet.x2)/2,Math.min(packet.y1,packet.y2)-70,packet.x2,packet.y2);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle="#080908";ctx.fillRect(x-10,y-13,20,25);ctx.strokeStyle=packet.color;ctx.strokeRect(x-9.5,y-12.5,19,24);ctx.fillStyle=packet.color;ctx.fillRect(x-5,y-7,10,2);ctx.fillRect(x-5,y-2,10,2);ctx.fillRect(x-5,y+3,7,2);
  const label=packet.label.toUpperCase().slice(0,22);ctx.font="bold 7px monospace";const width=Math.min(118,ctx.measureText(label).width+12);ctx.fillStyle="#070807ed";ctx.fillRect(x-width/2,y+16,width,13);ctx.fillStyle=packet.color;ctx.textAlign="center";ctx.fillText(label,x,y+25);ctx.textAlign="left";ctx.globalAlpha=1;if(t>=1)artifactPackets.splice(i,1)}
}
function move(dt){agents.forEach(a=>{const dx=a.tx-a.x,dy=a.ty-a.y,d=Math.hypot(dx,dy);if(d>1){const step=Math.min(d,dt*.11);a.x+=dx/d*step;a.y+=dy/d*step;if(Math.random()<.07)state.particles.push({x:a.x,y:a.y+18,color:a.color,life:.35,dx:0,dy:.3})}else if(a.path&&a.path.length){const next=a.path.shift();a.tx=next.x;a.ty=next.y}})}
function ambient(now){
 const phrases={helm:["checking dependencies","watching floor status"],scout:["scanning media board","reading photo notes"],forge:["checking SEO queue","fetching portal spec"],archive:["checking account tokens","syncing portal registry"],sentinel:["sampling compliance logs","checking mandatory fields"],relay:["checking approval queue","staging publish route"],warden:["polling live portals","collecting link list"]};
 const walkSpots=[points.photo,points.draft,points.lounge,{x:245,y:292},{x:650,y:292},{x:245,y:495},{x:610,y:495},{x:500,y:102}];
 agents.forEach(a=>{if(a.returnAt&&now>a.returnAt&&a.state==="idle"){const h=points[a.zone]||points.command;navigate(a,h.x,h.y);a.activity="";a.returnAt=0}});
 if(now<state.ambientAt)return;const idle=agents.filter(a=>a.state==="idle"&&a.zone!=="core"&&!a.returnAt);if(idle.length){const a=idle[Math.floor(Math.random()*idle.length)],spot=walkSpots[Math.floor(Math.random()*walkSpots.length)];navigate(a,spot.x+(Math.random()-.5)*24,spot.y+(Math.random()-.5)*18);a.activity=phrases[a.id][Math.floor(Math.random()*phrases[a.id].length)];a.returnAt=now+5000+Math.random()*4500}state.ambientAt=now+1300+Math.random()*1700;
}
function interactions(){
 agents.forEach(a=>{if(a.state==="working"||a.state==="reviewing"){ctx.fillStyle="#080908e8";ctx.fillRect(a.x-15,a.y-37,30,11);ctx.fillStyle=a.color;for(let i=0;i<3;i++)ctx.fillRect(a.x-7+i*7,a.y-33,3,3)}});
 for(let i=0;i<agents.length;i++)for(let j=i+1;j<agents.length;j++){const a=agents[i],b=agents[j],d=Math.hypot(a.x-b.x,a.y-b.y);if(d<122&&(a.zone==="core"||b.zone==="core")){const x=(a.x+b.x)/2,y=Math.min(a.y,b.y)-43,t=(performance.now()/1100)%1,px=a.x+(b.x-a.x)*t,py=a.y-15+(b.y-a.y)*t;ctx.strokeStyle="#8b8069";ctx.setLineDash([2,4]);ctx.beginPath();ctx.moveTo(a.x,a.y-15);ctx.lineTo(b.x,b.y-15);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle="#e0cf8a";ctx.fillRect(px-3,py-3,6,6);ctx.fillStyle="#080908";ctx.fillRect(x-31,y,62,13);ctx.fillStyle="#d2c598";ctx.font="bold 7px monospace";ctx.textAlign="center";ctx.fillText("LIVE HANDOFF",x,y+9);ctx.textAlign="left"}}
}
function draw(){const w=canvas.clientWidth,h=canvas.clientHeight;ctx.clearRect(0,0,w,h);const t=transform();ctx.save();ctx.translate(t.ox,t.oy);ctx.scale(t.s,t.s);room();furniture();particles();drawCommSignals();drawArtifactPackets();agents.forEach(drawAgent);interactions();ctx.restore()}
function tick(now){
 const dt=Math.min(40,now-state.last);state.last=now;
 if(state.running&&!state.approval){
  state.elapsed=Math.min(state.duration,state.elapsed+dt*state.speed);
  if(state.mode==="verify"){
   while(state.verifyCursor<verifyTimeline.length&&state.elapsed>=verifyTimeline[state.verifyCursor].at)verifyTimeline[state.verifyCursor++].run();
   if(!state.complete){const p=Math.min(100,Math.round(90+(state.verifyCursor/verifyTimeline.length)*10));$("#progressBar").style.width=p+"%";$("#progressLabel").textContent=p+"% · "+formatDuration(state.duration-state.elapsed)+" left"}
  }else{
   while(state.cursor<timeline.length&&state.elapsed>=timeline[state.cursor].at)timeline[state.cursor++].run();
   if(!state.approval){const progress=Math.min(96,Math.floor(state.elapsed/state.duration*100));$("#progressBar").style.width=progress+"%";$("#progressLabel").textContent=progress+"% · "+formatDuration(state.duration-state.elapsed)+" left"}
   state.spend=Math.min(2.14,state.elapsed/1000*.0059);$("#spendMetric").textContent="$"+state.spend.toFixed(2);
  }
 }
 ambient(now);move(dt);draw();requestAnimationFrame(tick);
}
function canvasClick(e){const r=canvas.getBoundingClientRect(),t=transform(),x=(e.clientX-r.left-t.ox)/t.s,y=(e.clientY-r.top-t.oy)/t.s,a=agents.find(q=>Math.hypot(q.x-x,q.y-y)<30);if(a)return select(a.id);const z=zones.find(q=>x>=q.x&&x<=q.x+q.w&&y>=q.y&&y<=q.y+q.h);if(z){const box=$("#selection"),crew=agents.filter(a=>a.zone===z.id).length;box.querySelector("span").textContent="STATION ZONE";box.querySelector("b").textContent=z.name;box.querySelector("p").textContent=crew+" crew assigned · "+z.type.toUpperCase()+" subsystem online.";box.style.borderColor=z.color;box.querySelector("span").style.color=z.color}}
function clock(){$("#clock").textContent=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Warsaw",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(new Date())}
function transportState(status,detail={}){
 const badge=$("#connectionBadge"),label=$("#connectionText"),bus=$("#eventBusStatus"),footer=$("#transportStatus"),session=(detail.sessionId||bridge&&bridge.sessionId||"session_pending").split("_").pop().slice(-6).toUpperCase();
 badge.classList.remove("connecting","online","offline");badge.classList.add(status);badge.dataset.mode=detail.mode||"mock";
 if(status==="online"){label.textContent="PORTAL LINK";bus.textContent="ONLINE";footer.textContent="SIM "+session+" · "+(detail.rtt||"--")+"ms · queue "+(detail.queueDepth||0)}
 else if(status==="connecting"){label.textContent="LINKING";bus.textContent="LINKING";footer.textContent="Negotiating portal session "+session}
 else{label.textContent="OFFLINE";bus.textContent="OFFLINE";footer.textContent="Local mission engine only"}
 badge.title="Portal transport · session "+session;
}
function bindTransport(){
 if(!bridge){transportState("offline");return}
 bridge.addEventListener("connection",e=>transportState(e.detail.status,e.detail));
 bridge.addEventListener("heartbeat",e=>transportState("online",e.detail));
 bridge.addEventListener("queue",e=>{const status=bridge.snapshot();transportState(status.status,{sessionId:status.sessionId,mode:status.mode,rtt:status.lastAck&&status.lastAck.latency,queueDepth:e.detail.depth})});
 bridge.addEventListener("ack",e=>transportState("online",{sessionId:e.detail.sessionId,mode:e.detail.mode,rtt:e.detail.latency,queueDepth:bridge.snapshot().queueDepth}));
 bridge.connect().then(info=>event("grok","Mock transport connected","Persistent local session "+info.sessionId.split("_").pop().toUpperCase()+" is receiving commands and telemetry.","green")).catch(()=>transportState("offline"));
}
$("#startBtn").onclick=start;$("#pauseBtn").onclick=pause;$("#resetBtn").onclick=()=>reset();$("#setupBtn").onclick=()=>{loadSetupForm();$("#setupDialog").showModal()};$("#saveSetup").onclick=saveSetupForm;$("#speed").onchange=e=>{state.speed=Number(e.target.value);event("system","Timeline speed changed","System is running at "+state.speed+"×.","amber")};$("#approveBtn").onclick=()=>resolve(true);$("#rejectBtn").onclick=()=>resolve(false);$("#inspectBtn").onclick=()=>$("#inspectDialog").showModal();$("#clearFeed").onclick=()=>{$("#eventFeed").innerHTML="";state.count=0;$("#eventCount").textContent="00 EVENTS"};canvas.onclick=canvasClick;window.onresize=resize;if("ResizeObserver"in window)new ResizeObserver(resize).observe(canvas);
window.onkeydown=e=>{if(e.code==="Space"&&e.target.tagName!=="BUTTON"){e.preventDefault();state.running?pause():start()}if(e.key.toLowerCase()==="r")reset()};
bindLedger();
bindTransport();
renderRoster();renderMissionInput();resize();select("helm");stage(null,0,"Publish "+state.mission.seller.name.split(" ")[0]+"'s property on "+state.mission.portals.length+" portals","Register accounts, write SEO listings, audit, publish, and verify live links.");document.querySelectorAll("#stages span").forEach(n=>n.classList.remove("active","done"));
event("system","Station online","Room telemetry, pathing, and the six-minute listing clock are live.","green");event("vault","Portal registry mounted","Portal account list and credential vault are ready for the seller brief.","cyan");event("airlock","Safety boundary armed","Listing publication requires one operator decision.","amber");
clock();setInterval(clock,1000);requestAnimationFrame(tick);
const autoplay=new URLSearchParams(location.search).get("autoplay");
if(autoplay==="ledger")setTimeout(ledgerShowcase,250);
else if(autoplay==="comms")setTimeout(()=>{state.elapsed=122000;agent("scout","complete","media delivered","media");agent("forge","delegating","routing listing pack","writing");agent("archive","working","binding portal accounts","registry");agent("sentinel","reviewing","opening audit channel","audit");sendComm("scout","forge","media.pack · photo + video policy","handoff",16000);sendComm("forge","sentinel","listing.pack · 6 variants + accounts","handoff",16000);sendComm("archive","sentinel","registry.index · accounts verified / audit ready","audit",16000);event("system","Agent message bus active","Three encrypted work packets are moving through the operation.","green");stage("compliance",55,"Live inter-agent routing","Media, listing, and account packets are moving between specialist agents.")},250);
else if(autoplay==="handoff")setTimeout(()=>{state.elapsed=122000;agent("forge","delegating","handing off listing pack","core");agent("sentinel","working","receiving listing pack","core");const forge=agents.find(x=>x.id==="forge"),sentinel=agents.find(x=>x.id==="sentinel");Object.assign(forge,{x:510,y:292,tx:510,ty:292,path:[]});Object.assign(sentinel,{x:400,y:270,tx:400,ty:270,path:[]});event("forge","Live handoff","Forge and Sentinel are transferring the audited listing pack at the common table.","amber");stage("compliance",55,"Live evidence handoff","Two agents are exchanging the SEO variants and account sessions at the common table.")},250);
else if(autoplay==="approval")setTimeout(()=>{state.elapsed=205000;event("relay","Human decision requested","The audited listing pack is paused at the release boundary.","amber");agent("sentinel","complete","audit passed 6/6","audit");agent("relay","waiting approval","awaiting final yes","publish");agent("helm","waiting approval","decision packet ready","lounge");stage("publish",92,"Final approval required","The complete listing pack is waiting for one human decision.");requestApproval()},250);
else if(autoplay==="verify")setTimeout(()=>{state.elapsed=238000;agent("warden","working","verifying live listings","verify");state.publishedUrls=[{portal:"OLX",id:"olx-8432112",url:"https://olx.example/olx-8432112",agent:"warden"},{portal:"Otodom",id:"otodom-88910",url:"https://otodom.example/88910",agent:"warden"},{portal:"Morizon",id:"morizon-11042",url:"https://morizon.example/11042",agent:"warden"}];renderLinks();event("warden","Verification in progress","Confirming live listings and collecting public links.","cyan");stage("verify",62,"Verifying published listings","Warden is confirming every ad is live and collecting its public URL.")},250);
else if(autoplay){state.speed=50;$("#speed").value="10";setTimeout(start,250)}
})();
