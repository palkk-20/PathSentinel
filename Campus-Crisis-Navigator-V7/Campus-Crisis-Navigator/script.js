/* Real AGC campus (Amritsar Group of Colleges). Places and names come from the user's Google Maps screenshots; lat/lng read off them assuming ~zoom 18 (approximate).
   Edge weights = straight-line metres between the two places (NOT surveyed walking distance). Main Gate and Pharmacy Department positions are inferred from the route order given by the user and need on-site verification. */
const SAMPLE_NODES=[
{id:'A',name:'Main Gate',icon:'🚪',x:93,y:2,lat:31.578997,lng:74.9913856},
{id:'B',name:'Amritsar Law College',icon:'🏛️',x:70,y:9,lat:31.5787914,lng:74.990876},
{id:'C',name:'ACET Cafeteria',icon:'🍴',x:67,y:37,lat:31.5781288,lng:74.9907955},
{id:'D',name:'Pharmacy Department',icon:'💊',x:28,y:37,lat:31.5781196,lng:74.9899158},
{id:'E',name:'ACET Main Block',icon:'🏢',x:25,y:53,lat:31.5777403,lng:74.9898568},
{id:'F',name:'Central Library (ACET)',icon:'📚',x:12,y:74,lat:31.5772331,lng:74.9895618},
{id:'G',name:'AGC Main Ground',icon:'🌳',x:50,y:55,lat:31.5776946,lng:74.9904201},
{id:'H',name:'AGC Basketball Court',icon:'🏀',x:51,y:72,lat:31.5772879,lng:74.9904469},
{id:'I',name:'AGC Block (Amritsar Group of Colleges)',icon:'🎓',x:48,y:85,lat:31.5769863,lng:74.9903771},
{id:'J',name:'AGC Parking',icon:'🅿️',x:83,y:45,lat:31.5779186,lng:74.991171},
{id:'K',name:'AGC Staff Residency',icon:'🏠',x:72,y:55,lat:31.5776946,lng:74.9909082},
{id:'L',name:'ACET Park',icon:'🌲',x:88,y:24,lat:31.5784349,lng:74.9912676}
];
const SAMPLE_EDGES=[{a:'A',b:'B',w:53},{a:'A',b:'J',w:122},{a:'A',b:'L',w:64},{a:'B',b:'C',w:74},{a:'B',b:'L',w:54},{a:'C',b:'D',w:83},{a:'C',b:'J',w:43},{a:'C',b:'G',w:60},{a:'C',b:'K',w:49},{a:'D',b:'E',w:43},{a:'D',b:'G',w:67},{a:'E',b:'F',w:63},{a:'E',b:'G',w:54},{a:'F',b:'I',w:82},{a:'G',b:'H',w:45},{a:'G',b:'K',w:46},{a:'G',b:'I',w:79},{a:'H',b:'I',w:34},{a:'J',b:'K',w:35},{a:'J',b:'L',w:58}];
const $=id=>document.getElementById(id),clone=x=>JSON.parse(JSON.stringify(x)),key=(a,b)=>[a,b].sort().join('|');
let nodes=clone(SAMPLE_NODES),edges=clone(SAMPLE_EDGES),blocked=new Set(),start='',goal='',routes=[],selectedRoute=0,current='',journeyIndex=0,navigationStarted=false,crisisDone=false,crisisStep=2,dialogAction='close';
const STORAGE='ccn_floyd_warshall_v2';
const nameOf=id=>nodes.find(n=>n.id===id)?.name||id;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function save(){try{localStorage.setItem(STORAGE,JSON.stringify({nodes,edges,blocked:[...blocked]}))}catch(e){}}
function load(){try{const s=JSON.parse(localStorage.getItem(STORAGE));if(s?.nodes?.length){nodes=s.nodes;edges=s.edges||clone(SAMPLE_EDGES);blocked=new Set(s.blocked||[]);
  // Old saved copies may be missing original buildings/roads (which would break direct routes). Restore them.
  SAMPLE_NODES.forEach(n=>{if(!nodes.some(x=>x.id===n.id))nodes.push(clone(n))});
  SAMPLE_EDGES.forEach(e=>{if(nodes.some(n=>n.id===e.a)&&nodes.some(n=>n.id===e.b)&&!edges.some(x=>key(x.a,x.b)===key(e.a,e.b)))edges.push(clone(e))});
  return true}}catch(e){}return false}
function resetData(){nodes=clone(SAMPLE_NODES);edges=clone(SAMPLE_EDGES);blocked.clear();save()}
// Roads that are blocked (live crisis) or closed (by admin) are excluded.
// NOTE: a road the admin marked "Fixed" is a REPAIRED road. It is fully open for routing;
// "fixed" only means it will never be picked for a random automatic crisis again.
function openEdges(extra=new Set()){const b=new Set([...blocked,...extra]);return edges.filter(e=>!b.has(key(e.a,e.b))&&!e.closed)}
function floydWarshall(es=openEdges()){
  // Floyd-Warshall: shortest distance between EVERY pair of buildings (roads are two-way).
  // Ties in distance are broken by the number of roads, so a direct road always beats an
  // equally long detour.
  const EPS=1e-9;
  const ids=nodes.map(n=>n.id), index=new Map(ids.map((id,i)=>[id,i])), n=ids.length;
  const dist=Array.from({length:n},()=>Array(n).fill(Infinity));
  const hops=Array.from({length:n},()=>Array(n).fill(Infinity));
  const next=Array.from({length:n},()=>Array(n).fill(null));
  const better=(c1,h1,c2,h2)=>c1<c2-EPS||(Math.abs(c1-c2)<=EPS&&h1<h2);
  for(let i=0;i<n;i++){dist[i][i]=0;hops[i][i]=0;next[i][i]=ids[i]}
  for(const e of es){
    const i=index.get(e.a),j=index.get(e.b),w=Number(e.w);
    if(i===undefined||j===undefined||!Number.isFinite(w)||w<0)continue;
    if(better(w,1,dist[i][j],hops[i][j])){
      dist[i][j]=dist[j][i]=w;hops[i][j]=hops[j][i]=1;next[i][j]=ids[j];next[j][i]=ids[i];
    }
  }
  for(let k=0;k<n;k++)for(let i=0;i<n;i++){
    if(dist[i][k]===Infinity)continue;
    for(let j=0;j<n;j++){
      if(dist[k][j]===Infinity)continue;
      const c=dist[i][k]+dist[k][j],h=hops[i][k]+hops[k][j];
      if(better(c,h,dist[i][j],hops[i][j])){dist[i][j]=c;hops[i][j]=h;next[i][j]=next[i][k]}
    }
  }
  return {ids,index,dist,hops,next};
}
function routeWeight(path, es=openEdges()){
  if(!Array.isArray(path)||path.length<2)return path?.length===1?0:Infinity;
  let total=0;
  for(let i=0;i<path.length-1;i++){
    const e=es.find(x=>key(x.a,x.b)===key(path[i],path[i+1]));
    if(!e)return Infinity;
    total+=Number(e.w);
  }
  return total;
}
function floydShortestPath(s,g,es=openEdges()){
  const fw=floydWarshall(es),si=fw.index.get(s),gi=fw.index.get(g);
  if(si===undefined||gi===undefined||fw.dist[si][gi]===Infinity)return{path:[],cost:Infinity};
  const path=[s];let cur=s,guard=0;
  while(cur!==g&&guard++<=fw.ids.length){
    const nextId=fw.next[fw.index.get(cur)][gi];
    if(nextId===null||nextId===undefined)return{path:[],cost:Infinity};
    cur=nextId;path.push(cur);
  }
  if(cur!==g)return{path:[],cost:Infinity};
  return{path,cost:routeWeight(path,es)};
}
function pathSig(p){return p.join('>')}
function findMultipleRoutes(s,g){
  if(!s||!g||s===g)return [];
  const open=openEdges();
  const adj=new Map(nodes.map(n=>[n.id,[]]));
  for(const e of open){
    if(!adj.has(e.a)||!adj.has(e.b))continue;
    adj.get(e.a).push({to:e.b,cost:Number(e.w)});
    adj.get(e.b).push({to:e.a,cost:Number(e.w)});
  }
  for(const list of adj.values())list.sort((a,b)=>a.to.localeCompare(b.to));

  // Floyd-Warshall is the authoritative shortest-path calculation.
  const shortest=floydShortestPath(s,g,open);
  if(!shortest.path.length)return [];

  // DFS (with backtracking) enumerates simple paths only for ALTERNATIVE routes. The shortest route is
  // inserted separately, so no DFS ordering can replace it.
  const found=[];
  const path=[s],visited=new Set([s]);
  let dfsCalls=0;
  function dfs(u,cost){
    if(++dfsCalls>40000)return; // safety cap so large campuses never freeze the browser
    if(u===g){
      const sig=pathSig(path);
      if(sig!==pathSig(shortest.path))found.push({path:[...path],cost});
      return;
    }
    for(const edge of (adj.get(u)||[])){
      if(visited.has(edge.to))continue;
      visited.add(edge.to);path.push(edge.to);
      dfs(edge.to,cost+edge.cost);
      path.pop();visited.delete(edge.to);
    }
  }
  dfs(s,0);
  found.sort((a,b)=>a.cost-b.cost||a.path.length-b.path.length||pathSig(a.path).localeCompare(pathSig(b.path)));

  // Always keep Floyd-Warshall's shortest route at position 0.
  // Direct shortest roads therefore win for EVERY direct campus connection.
  const result=[{path:shortest.path,cost:shortest.cost},...found];
  const unique=[];const seen=new Set();
  for(const r of result){
    const sig=pathSig(r.path);
    if(seen.has(sig))continue;
    seen.add(sig);unique.push(r);
  }
  return unique.slice(0,5);
}

function routeText(r){return r.path.map(nameOf).join(' → ')}
function clearLiveUpdates(label='No active route'){const feed=$('notificationFeed');if(feed)feed.innerHTML='';const el=$('feedRouteLabel');if(el)el.textContent=label}
function startLiveRouteSession(label){clearLiveUpdates(label);notify('Route session started',`Live updates for this journey: ${label}`,'info')}
function renderSelects(){['startSelect','goalSelect','edgeFrom','edgeTo'].forEach(id=>{const el=$(id);if(!el)return;const old=el.value;el.innerHTML='<option value="">Select</option>'+nodes.map(n=>`<option value="${n.id}">${n.id} — ${esc(n.name)}</option>`).join('');if(nodes.some(n=>n.id===old))el.value=old});$('homeBuildings').textContent=nodes.length;$('homeRoads').textContent=edges.length;$('editorBuildingCount').textContent=nodes.length;$('editorRoadCount').textContent=edges.length}
function showDialog(title,text,type='danger',routeText='',action='close'){dialogAction=action;const back=$('crisisDialog');$('dialogTitle').textContent=title;$('dialogText').textContent=text;$('dialogRoute').textContent=routeText;back.classList.add('show');back.setAttribute('aria-hidden','false');$('dialogIcon').textContent=type==='success'?'✓':'🚨';$('dialogTag').textContent=type==='success'?'NAVIGATION UPDATE':'SAFETY ALERT';$('dialogOk').textContent=title.startsWith('Destination reached')?'Exit':'OK'}
function closeDialog(){const back=$('crisisDialog');back.classList.remove('show');back.setAttribute('aria-hidden','true')}
function changeRoute(){if(!start||!goal||!routes.length){toast('Find a route first.');return}navigationStarted=false;crisisDone=false;journeyIndex=0;current=start;selectedRoute=0;clearLiveUpdates(`New route choice: ${nameOf(start)} → ${nameOf(goal)}`);setStatus('ready','READY');renderRoutes();renderJourney();updateMap();syncWalkButtons();notify('Choose another route',`Select a different route from ${nameOf(start)} to ${nameOf(goal)} and try again.`,'info');$('routesList').scrollIntoView({behavior:'smooth',block:'center'});closeDialog()}
function dialogPrimaryAction(){closeDialog()}
function notify(title,text,type='info'){const feed=$('notificationFeed');if(!feed)return;const d=document.createElement('div');d.className='notification';const icon=type==='danger'?'🚨':type==='success'?'✓':'•';d.innerHTML=`<span class="nicon">${icon}</span><div><b>${esc(title)}</b><small>${esc(text)}</small></div>`;feed.prepend(d)}
function setStatus(type,text){const s=$('statusDot');s.className='status '+type;s.textContent=text;$('stepBadge').className='status '+type;$('stepBadge').textContent=text}
function showPage(id){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));$(id).classList.add('active');window.scrollTo({top:0,behavior:'smooth'})}
function syncWalkButtons(){
  const hasRoute=routes.length>0;
  const startBtn=$('startNavBtn'), nextBtn=$('nextBtn');
  // Keep the controls clickable. The functions themselves explain what to do if a step is not ready.
  startBtn.disabled=false;
  nextBtn.disabled=false;
  startBtn.classList.toggle('waiting', !hasRoute || navigationStarted);
  nextBtn.classList.toggle('waiting', !hasRoute || !navigationStarted);
  startBtn.textContent = navigationStarted ? 'Walking…' : 'Start Walking';
  $('changeRouteBtn').textContent = navigationStarted ? 'Change Route' : 'Choose Another Route';
}

/* ===== STABLE WALKER SUPPORT: no event-handler wrapping ===== */
function toast(m){const t=$('toast');if(!t)return;t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2600)}
let walkTimer=null,paused=false,walkerPos=null,trail=[];
/* ===== VOICE: reliable speech queue (Chrome/Edge/Android safe) ===== */
let voiceReady=false, preferredVoice=null;
const synth=('speechSynthesis' in window)?window.speechSynthesis:null;
let speechQueue=[],speaking=false,speechGen=0,speakTimer=null,keepAliveTimer=null;
function loadSpeechVoices(){
  if(!synth) return;
  const voices=synth.getVoices()||[];
  preferredVoice=voices.find(v=>/^en-IN$/i.test(v.lang))
    || voices.find(v=>/^en-GB$/i.test(v.lang))
    || voices.find(v=>/^en-US$/i.test(v.lang))
    || voices.find(v=>/^en/i.test(v.lang))
    || voices[0] || null;
}
function unlockSpeech(){
  if(!synth) return false;
  try{
    loadSpeechVoices();
    const u=new SpeechSynthesisUtterance(' ');
    u.volume=0;
    if(preferredVoice)u.voice=preferredVoice;
    synth.speak(u);
    voiceReady=true;
    return true;
  }catch(e){return false}
}
function stopSpeech(){
  speechGen++;speechQueue=[];speaking=false;
  clearTimeout(speakTimer);speakTimer=null;
  clearInterval(keepAliveTimer);keepAliveTimer=null;
  try{if(synth){synth.cancel()}}catch(e){}
}
function speakNext(){
  if(!synth)return;
  if(!speechQueue.length){speaking=false;clearInterval(keepAliveTimer);keepAliveTimer=null;return}
  speaking=true;
  const gen=speechGen,text=speechQueue.shift();
  let finished=false;
  const done=()=>{if(finished||gen!==speechGen)return;finished=true;clearTimeout(watchdog);speakNext()};
  // Safety net: if the browser never fires "end", move on anyway.
  const watchdog=setTimeout(done,Math.max(4000,text.length*130));
  try{
    const u=new SpeechSynthesisUtterance(text);
    u.lang=preferredVoice?.lang||'en-IN';
    if(preferredVoice)u.voice=preferredVoice;
    u.rate=0.95;u.pitch=1;u.volume=1;
    u.onend=done;u.onerror=done;
    if(synth.paused)synth.resume();
    synth.speak(u);
    // Chrome silently stops long speech after ~15s; a pause/resume tick keeps it going.
    if(!keepAliveTimer)keepAliveTimer=setInterval(()=>{if(synth.speaking&&!synth.paused){synth.pause();synth.resume()}},10000);
  }catch(e){finished=true;clearTimeout(watchdog);speaking=false}
}
function scheduleSpeak(delay=0){
  if(speaking||speakTimer)return;
  speakTimer=setTimeout(()=>{speakTimer=null;if(!speaking)speakNext()},delay);
}
// say(text)        -> interrupts whatever is being spoken and speaks this now
// say(text,true)   -> waits its turn behind what is already queued (nothing is lost)
function say(t,queue=false){
  try{
    if(!synth||!t)return;
    loadSpeechVoices();
    if(!queue){stopSpeech();speechQueue.push(String(t));scheduleSpeak(90)}
    else{speechQueue.push(String(t));scheduleSpeak(0)}
  }catch(e){/* voice is optional; navigation must continue */}
}
// "From Library, go to Auditorium, then Fire Station."
function spokenDirections(path){
  const names=(path||[]).map(nameOf);
  if(names.length<2)return '';
  if(names.length===2)return `From ${names[0]}, go straight to ${names[1]}.`;
  return `From ${names[0]}, go to ${names[1]}, then ${names.slice(2).join(', then ')}.`;
}
if(synth){
  synth.onvoiceschanged=loadSpeechVoices;
  loadSpeechVoices();
}

function remainingCost(){const p=routes[selectedRoute]?.path||[];let c=0;for(let i=journeyIndex;i<p.length-1;i++){const e=edges.find(x=>key(x.a,x.b)===key(p[i],p[i+1]));c+=e?(+e.w)*(e.mult>1?e.mult:1):0}return c}
function updateLive(){const p=routes[selectedRoute]?.path;if(!p||(!navigationStarted&&journeyIndex===0)){const el=$('liveStats');if(el)el.textContent='Press Start Walking, then press Next at each building.';return}const c=remainingCost(),arrived=journeyIndex>=p.length-1;const el=$('liveStats');if(el)el.innerHTML=arrived?'🏁 <b>Arrived</b> — journey complete.':`Next: <b>${esc(nameOf(p[journeyIndex+1]))}</b> · Remaining <b>${c}</b> · Stop ${journeyIndex+1}/${p.length}`}
function moveWalker(){const w=document.querySelector('#campusMap .walker');if(w&&walkerPos)requestAnimationFrame(()=>{w.style.left=walkerPos.x+'%';w.style.top=walkerPos.y+'%'})}
function paintWalker(){const n=nodes.find(x=>x.id===current);if(!n){walkerPos=null;return}const old=walkerPos;walkerPos={x:n.x,y:n.y,prevX:old?.x??n.x,prevY:old?.y??n.y,anim:false};updateMap();updateLive()}

/* ===== Active crisis helpers: a crisis road stays closed and visible until the admin presses Fix ===== */
function activeCrisisFor(k){try{return getReps().find(x=>x.road&&(x.status==='Road closed'||x.status==='Open')&&key(...x.road.split('|'))===k)||null}catch(err){return null}}
function crisisText(c){const [a,b]=c.road.split('|');return `Road ${nameOf(a)} ↔ ${nameOf(b)} is closed because of ${typeof phraseOf==='function'?phraseOf(c.type):String(c.type||'a crisis').toLowerCase()}. It stays closed until the admin fixes it.`}
// Would the shortest way, if the crisis roads were open, use a crisis road? Returns that crisis or null.
function crisisOnWay(s,g){
  const ks=new Set(edges.filter(e=>e.closed&&activeCrisisFor(key(e.a,e.b))).map(e=>key(e.a,e.b)));
  if(!ks.size)return null;
  const p=floydShortestPath(s,g,edges.filter(e=>!e.closed||ks.has(key(e.a,e.b))));
  for(let i=0;i<p.path.length-1;i++){const k=key(p.path[i],p.path[i+1]);if(ks.has(k))return {k,c:activeCrisisFor(k),a:p.path[i],b:p.path[i+1]}}
  return null;
}
function plan(){
  start=$('startSelect').value;goal=$('goalSelect').value;
  if(!start||!goal||start===goal){toast('Choose two different locations');return}
  clearLiveUpdates(`Planning: ${nameOf(start)} → ${nameOf(goal)}`);
  blocked.clear();
  routes=findMultipleRoutes(start,goal);
  selectedRoute=0;current=start;journeyIndex=0;navigationStarted=false;crisisDone=false;
  crisisStep=routes.length&&routes[0].path.length>2?2+Math.floor(Math.random()*2):999;
  walkerPos=null;trail=[];
  renderRoutes();renderJourney();updateMap();
  $('routeCount').textContent=routes.length;
  if($('summary'))$('summary').textContent='';
  $('routeSummary').textContent=routes.length?(routes.length===1?'1 shortest route found.':`${routes.length} route options found: 1 shortest + ${routes.length-1} alternatives.`):'No route is available.';
  syncWalkButtons();setStatus('ready','READY');
  if(typeof renderCost==='function'){costInfo={planned:routes[0]?.cost||0,total:routes[0]?.cost||0,covered:0,crisis:null,prevTotal:null,oldRemaining:0,newRemaining:0};renderCost()}
  notify('Routes found',routes.length?`Shortest route: ${routeText(routes[0])}`:'No connected route found.',routes.length?'success':'danger');
  if(routes.length){unlockSpeech();say(`Route found. The shortest route is ${spokenDirections(routes[0].path)} Total distance ${routes[0].cost}.`);}
  const cw=crisisOnWay(start,goal);
  if(cw&&cw.c){const t=crisisText(cw.c);notify('Crisis still active on this way',t,'danger');say(`Crisis alert! ${t}`,true);showDialog('Active crisis on this way 🚨',t+(routes.length?(slowOf(cw.c)?' Your route uses the cheapest way around it.':' Your route avoids it.'):' No other route is available.'),'danger',routes.length?routeText(routes[0]):'No route available')}
}

function renderRoutes(){
  const box=$('routesList');if(!routes.length){box.innerHTML='<div class="empty">No route available.</div>';return}
  box.innerHTML=routes.map((r,i)=>`<button type="button" class="route-item ${i===selectedRoute?'selected':''}" data-route="${i}"><div><b>${i===0?'Shortest route':`Alternative ${i}`}</b><span>${esc(routeText(r))}</span></div><strong class="route-cost">${r.cost}</strong></button>`).join('');
  box.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>{selectedRoute=+b.dataset.route;current=start;journeyIndex=0;navigationStarted=false;crisisDone=false;walkerPos=null;trail=[];setStatus('ready','READY');syncWalkButtons();renderRoutes();renderJourney();updateMap();updateLive();if(typeof renderCost==='function'){costInfo={planned:routes[selectedRoute]?.cost||0,total:routes[selectedRoute]?.cost||0,covered:0,crisis:null,prevTotal:null,oldRemaining:0,newRemaining:0};renderCost()}clearLiveUpdates(`Selected: ${routeText(routes[selectedRoute])}`);notify('Route selected',`Selected route: ${routeText(routes[selectedRoute])}. Press Start Walking to begin.`,'success')})
}
function renderJourney(){const r=routes[selectedRoute];if(!r){$('journeySteps').innerHTML='<div class="empty">Select a route to begin.</div>';return}const path=r.path;current=current||path[0];$('currentLocation').textContent=nameOf(current);$('currentGoal').textContent=nameOf(goal);const next=journeyIndex<path.length-1?nameOf(path[journeyIndex+1]):nameOf(goal);$('directionBox').innerHTML=`<span class="direction-icon">${journeyIndex<path.length-1?'🚶':'🏁'}</span><div><small>${journeyIndex<path.length-1?'Walk next':'Arrived at'}</small><b>${esc(next)}</b></div>`;$('progressBar').style.width=Math.min(100,(journeyIndex/(Math.max(1,path.length-1)))*100)+'%';$('journeySteps').innerHTML=path.map((id,i)=>`<div class="journey-step ${i===journeyIndex?'current':''} ${i<journeyIndex?'done':''}" data-step="${i}"><span>${i<journeyIndex?'✓':i+1}</span><div><b>${esc(nameOf(id))}</b>${i===journeyIndex?'<small>📍 You are here</small>':i===journeyIndex+1?'<small>🚶 Walk here next</small>':''}</div></div>`).join('');const active=$('journeySteps').querySelector('.journey-step.current');if(active)active.scrollIntoView({behavior:'smooth',block:'nearest'})}
function startNavigation(){
  if(!routes.length){toast('First choose Start + Destination and press Find Routes.');return}
  const r=routes[selectedRoute];
  if(!r||!Array.isArray(r.path)||r.path[0]!==start){toast('Please find the route again.');return}
  unlockSpeech();
  navigationStarted=true;current=start;journeyIndex=0;crisisDone=false;
  startLiveRouteSession(routeText(r));setStatus('walking','WALKING');syncWalkButtons();
  trail=[nameOf(start)];paintWalker();renderJourney();updateMap();updateLive();
  if(typeof renderCost==='function'){costInfo={planned:r.cost||0,total:r.cost||0,covered:0,crisis:null,prevTotal:null,oldRemaining:0,newRemaining:0};renderCost()}
  notify('Walking started',`You are at ${nameOf(current)}. Walk to ${nameOf(r.path[1]||goal)}.`,'success');
  say(`Walking started. You are at ${nameOf(current)}. Walk to ${nameOf(r.path[1]||goal)}.`);
  showDialog('Walking started',`You are now at ${nameOf(current)}. Follow the blue highlighted road. Press Next → only after you reach the next building.`,'success',r.path.map(nameOf).join(' → '));
}
function chooseCrisisEdge(path){
  if(!path||journeyIndex>=path.length-1)return null;
  const k=key(path[journeyIndex],path[journeyIndex+1]);
  return blocked.has(k)||getFixedRoads().includes(k)?null:k;
}
// Returns true when a crisis really happened (so the caller does not speak over it).
function automaticCrisis(){
  if(crisisDone||!navigationStarted||journeyIndex<crisisStep)return false;
  const r=routes[selectedRoute];if(!r||journeyIndex>=r.path.length-1)return false;
  const a=r.path[journeyIndex],b=r.path[journeyIndex+1],edgeKey=key(a,b);
  const e=edges.find(x=>key(x.a,x.b)===edgeKey);
  // A road the admin fixed is never picked for an automatic crisis again (but it stays walkable).
  if(getFixedRoads().includes(edgeKey))return false;
  if(!e||e.closed||e.mult>1||blocked.has(edgeKey))return false;
  const reason=typeof pickReason==='function'?pickReason():'road blocked';
  const slow=isSlowType(reason);
  if(!slow){
    // A closure lasts until the admin fixes it, so it must never cut the campus in two (DFS bridge check)
    // and the walker must still be able to reach the destination.
    if(criticalRoads().has(edgeKey))return false;
    if(!floydShortestPath(current,goal,openEdges(new Set([edgeKey]))).path.length)return false;
  }
  if(slow){e.mult=SLOW_MULT}else{blocked.add(edgeKey);e.closed=true}
  crisisDone=true;save();   // persists: stays until the admin fixes it
  crisisInfo={a,b,reason,slow,old:r.path.slice(journeyIndex).map(nameOf).join(' → '),oldPath:r.path.slice(journeyIndex),danger:/fire|flood|accident|gas/i.test(reason)};
  const msg=slow
    ?`You have reached ${nameOf(current)}. The next road to ${nameOf(b)} is slow because of ${reason} (distance counts ×${SLOW_MULT}). The best route is being recalculated from your current building.`
    :`You have reached ${nameOf(current)}. The next road to ${nameOf(b)} is blocked because of ${reason}. A new safe route is being calculated from your current building.`;
  setStatus(slow?'reroute':'danger',slow?'ROAD SLOW':'ROAD BLOCKED');crisisSpoke=true;notify(slow?'Road slowed':'Crisis detected',msg,'danger');
  // Spoken immediately (interrupts any older speech). The new route is queued right after it.
  say(slow
    ?`Crisis alert! You are at ${nameOf(current)}. The road from ${nameOf(a)} to ${nameOf(b)} is slow because of ${reason}.`
    :`${crisisInfo.danger?'Danger! ':'Crisis alert! '}You are at ${nameOf(current)}. The road from ${nameOf(a)} to ${nameOf(b)} is blocked because of ${reason}.`);
  if(typeof logAutoReport==='function')logAutoReport();
  updateMap();showDialog(slow?'Road slowed ⚠️':'Road blocked 🚨',msg,'danger',`${slow?'Slow':'Blocked'} next leg: ${nameOf(a)} → ${nameOf(b)}`);
  setTimeout(()=>rerouteFromCurrent(true),350);
  return true;
}
function rerouteFromCurrent(fromCrisis=false){
  const anchor=current;if(!anchor||!goal)return;
  const newRoutes=findMultipleRoutes(anchor,goal);
  routes=newRoutes;selectedRoute=0;current=anchor;journeyIndex=0;crisisDone=!!fromCrisis;crisisStep=999;
  if(typeof renderRoutes==='function')renderRoutes();renderJourney();paintWalker();updateMap();$('routeCount').textContent=routes.length;syncWalkButtons();updateLive();
  if(routes.length){
    setStatus('reroute','NEW ROUTE');const p=routeText(routes[0]);
    if(typeof renderCost==='function'&&fromCrisis){costInfo.crisis=crisisInfo;costInfo.oldRemaining=costInfo.oldRemaining||0;costInfo.newRemaining=routes[0].cost||0;costInfo.total=(costInfo.covered||0)+(routes[0].cost||0);renderCost()}
    notify('New safe route',`You are still at ${nameOf(anchor)}. Continue one building at a time: ${p}`,'success');
    if(fromCrisis){
      const oldTxt=crisisInfo?.old||'',danger=!!crisisInfo?.danger;
      if(crisisInfo?.slow&&crisisInfo.oldPath&&crisisInfo.oldPath.join('>')===routes[0].path.join('>')){
        const keep=`The slow road is still the fastest way. Continue on the same route. New remaining distance ${routes[0].cost}.`;
        say(keep,true);showDialog('Route kept ✓',keep,'danger','Route: '+p);return}
      // Tell the walker exactly what changed: old route -> new route, with directions.
      const spoken=`Your route has changed. `
        +(oldTxt?`Earlier you were going ${oldTxt.replace(/ → /g,', then ')}. `:'')
        +`Now follow the new route. ${spokenDirections(routes[0].path)} New remaining distance ${routes[0].cost}.`;
      say(spoken,true);
      const shown=`The blocked road is avoided. You are still at ${nameOf(anchor)}.`+(oldTxt?` Old route: ${oldTxt}.`:'')+` Continue on the new route.`;
      showDialog('Route changed ✓',shown,'danger','New route: '+p);
    }
  }else{
    setStatus('danger','NO ROUTE');notify('No safe route','There is no open path from the current building to the destination.','danger');syncWalkButtons();
    if(fromCrisis){say(`No safe route is available from ${nameOf(anchor)} to ${nameOf(goal)} right now. Please wait for a blocked road to reopen.`,true);showDialog('No safe route',`There is currently no open path from ${nameOf(anchor)} to ${nameOf(goal)}.`,'danger','Please wait for the blocked road to reopen.')}
  }
}
function nextStep(){
  if(!routes.length){toast('Find a route first.');return}
  if(!navigationStarted){toast('Press Start Walking first.');return}
  const r=routes[selectedRoute],path=r?.path;if(!Array.isArray(path)||path.length<2){toast('This route has no walking steps.');return}
  if(journeyIndex>=path.length-1){return}
  const from=path[journeyIndex],to=path[journeyIndex+1],k=key(from,to);
  const e=edges.find(x=>key(x.a,x.b)===k);
  if(!e||e.closed||blocked.has(k)){
    // The next road got closed (for example by the admin) before the walker used it.
    const rec=(typeof getReps==='function')?getReps().find(x=>x.status==='Road closed'&&rk(x)===k):null;
    const reason=rec&&typeof phraseOf==='function'?phraseOf(rec.type):'a road closure';
    crisisInfo={a:from,b:to,reason,old:path.slice(journeyIndex).map(nameOf).join(' → '),oldPath:path.slice(journeyIndex),danger:rec?DANGER_RE.test(rec.type):false,fromAdmin:true};
    say(`${crisisInfo.danger?'Danger! ':'Road closed. '}The road from ${nameOf(from)} to ${nameOf(to)} is closed because of ${reason}.`);
    showDialog('Road closed 🚨',`The road ${nameOf(from)} to ${nameOf(to)} is closed because of ${reason}. Finding a new route from ${nameOf(current)}.`,'danger','Recalculating from: '+nameOf(current)+' → '+nameOf(goal));
    setTimeout(()=>rerouteFromCurrent(true),350);
    return;
  }
  const oldNode=nodes.find(n=>n.id===current);
  current=to;journeyIndex++;
  const newNode=nodes.find(n=>n.id===current);walkerPos={x:newNode?.x??0,y:newNode?.y??0,prevX:oldNode?.x??newNode?.x??0,prevY:oldNode?.y??newNode?.y??0,anim:true};
  if(trail[trail.length-1]!==nameOf(current))trail.push(nameOf(current));
  renderJourney();updateMap();syncWalkButtons();updateLive();
  if(typeof renderCost==='function'){costInfo.covered=(costInfo.covered||0)+Number(e.w||0)*(e.mult>1?e.mult:1);renderCost()}
  if(journeyIndex>=path.length-1){
    walkerPos.anim=false;navigationStarted=false;setStatus('ready','ARRIVED');updateMap();syncWalkButtons();updateLive();
    notify('Destination reached',`You reached ${nameOf(goal)}. Path completed: ${routeText(r)}`,'success');notify('Journey complete',`You travelled ${routeText(r)}. Select another route above and press Start Walking again — no refresh is needed.`,'info');
    say(`You have reached ${nameOf(goal)}.`);
    showDialog('Destination reached ✓',`You have safely reached ${nameOf(goal)}. You can now select another route above and try the journey again.`,'success','Completed path: '+routeText(r),'routeSelect');
    return;
  }
  walkerPos.anim=false;updateMap();
  notify('You moved',`You are now at ${nameOf(current)}. Next: ${nameOf(path[journeyIndex+1])}.`,'info');
  // If a crisis happens on the next road it speaks the alert + the changed route itself,
  // so the normal "next building" sentence must not talk over it.
  edges.forEach(e=>{if(!e.closed||(e.a!==current&&e.b!==current))return;const c=activeCrisisFor(key(e.a,e.b));if(c)notify('Crisis near you',crisisText(c),'danger')});
  if(automaticCrisis())return;
  say(`You are now at ${nameOf(current)}. Next, walk to ${nameOf(path[journeyIndex+1])}.`);
}
/* ===== Real map (Leaflet + OpenStreetMap). Only the map drawing was replaced; graph, routing and crisis logic are unchanged. =====
   AGC reference point (Google Maps pin, from the user's own link): 31.5773702, 74.9903986. Map area and the Library/Cafeteria positions were read off the user's Google Maps screenshots assuming roughly zoom 18 (about 0.5 m per pixel), so they are approximate.
   Each building still stores its original x/y (0-100). xyToLatLng() spreads that layout over a ~16-acre box around the
   reference point. These positions are PLACEHOLDERS until real building coordinates are verified (see README). */
const AGC_CENTER=[31.5778092,74.9904201],AGC_SPAN_LAT=0.00238,AGC_SPAN_LNG=0.00225;
function xyToLatLng(x,y){return [AGC_CENTER[0]+(50-y)/100*AGC_SPAN_LAT,AGC_CENTER[1]+(x-50)/100*AGC_SPAN_LNG]}
/* A building placed by hand on the real map keeps its own lat/lng (saved with the campus). Others use the placeholder projection. */
function nodeLL(n){if(typeof n.lat==='number'&&typeof n.lng==='number')return[n.lat,n.lng];const m=SAMPLE_NODES.find(q=>q.id===n.id&&q.x===n.x&&q.y===n.y&&typeof q.lat==='number');return m?[m.lat,m.lng]:xyToLatLng(n.x,n.y)}
function llOfXY(x,y){const n=nodes.find(m=>m.x===x&&m.y===y);return n?nodeLL(n):xyToLatLng(x,y)}
let placeMode=false;
function metresBetween(p,q){const R=6371000,r=Math.PI/180,dLa=(q[0]-p[0])*r,dLo=(q[1]-p[1])*r,a=Math.sin(dLa/2)**2+Math.cos(p[0]*r)*Math.cos(q[0]*r)*Math.sin(dLo/2)**2;return 2*R*Math.asin(Math.sqrt(a))}
/* After a building is placed on the real map, every road touching it gets its cost from the real map distance (metres). */
function recalcRoadCosts(id){edges.forEach(e=>{if(e.a!==id&&e.b!==id)return;const a=nodes.find(n=>n.id===e.a),b=nodes.find(n=>n.id===e.b);if(a&&b)e.w=Math.max(1,Math.round(metresBetween(nodeLL(a),nodeLL(b))))})}
const _lmaps={};
function getLeafletMap(id,box){
  if(typeof L==='undefined'){box.innerHTML='<div class="empty">The map could not be loaded. Map tiles need an internet connection; please reload the page.</div>';return null}
  let s=_lmaps[id];
  if(s&&box.contains(s.host))return s;
  if(s){try{s.map.remove()}catch(e){}}
  box.innerHTML='';
  const host=document.createElement('div');
  host.style.cssText='width:100%;height:100%;min-height:300px;border-radius:14px;border:1px solid var(--line);overflow:hidden';
  box.appendChild(host);
  const map=L.map(host,{zoomControl:true,maxZoom:19,minZoom:15});
  const osm=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'});
  const sat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles &copy; Esri'}).addTo(map);
  L.control.layers({'Satellite':sat,'Street (OSM)':osm},null,{position:'topright'}).addTo(map);
  const note=L.control({position:'bottomleft'});
  note.onAdd=()=>{const d=L.DomUtil.create('div');d.style.cssText='background:rgba(255,255,255,.92);color:#26323d;padding:4px 8px;border-radius:6px;font:600 11px Inter,Segoe UI,Arial,sans-serif;max-width:260px';d.textContent='AGC campus, Amritsar. Positions are approximate; use Place buildings to align them. Costs = metres on the map.';return d};
  note.addTo(map);
  const pm=L.control({position:'topleft'});
  pm.onAdd=()=>{const b=L.DomUtil.create('button');b.type='button';b.style.cssText='cursor:pointer;border:1px solid #888;border-radius:6px;background:#fff;color:#26323d;padding:5px 9px;font:700 12px Inter,Segoe UI,Arial,sans-serif;margin-top:4px';const paint=()=>{b.textContent=placeMode?'📍 Placing: ON (drag buildings)':'📍 Place buildings: OFF'};paint();L.DomEvent.disableClickPropagation(b);b.onclick=()=>{placeMode=!placeMode;paint();if(placeMode)toast('Switch to Satellite, then drag each building onto its real position.');updateMap();renderEditorMap()};return b};
  pm.addTo(map);
  const bounds=L.latLngBounds(nodes.map(nodeLL)).pad(0.2);
  map.fitBounds(bounds);
  const layer=L.layerGroup().addTo(map);
  s=_lmaps[id]={map,layer,host,bounds,fitted:false};
  const fit=()=>{if(host.clientWidth>0&&host.clientHeight>0){map.invalidateSize();if(!s.fitted){map.fitBounds(bounds);s.fitted=true}}};
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(fit).observe(host);
  setTimeout(fit,0);
  return s;
}
function lmIcon(html){return L.divIcon({className:'',html,iconSize:[0,0],iconAnchor:[0,0]})}
function lmMarker(ll,html,z,opts){return L.marker(ll,Object.assign({icon:lmIcon(html),interactive:false,keyboard:false,zIndexOffset:z},opts||{}))}
function updateMap(){
  const box=$('campusMap');if(!box)return;
  const S=getLeafletMap('campusMap',box);if(!S)return;
  S.layer.clearLayers();
  const selected=routes[selectedRoute]?.path||[],activeEdges=new Set(),currentLeg=new Set();
  for(let i=0;i<selected.length-1;i++)activeEdges.add(key(selected[i],selected[i+1]));
  if(selected.length>1&&journeyIndex<selected.length-1)currentLeg.add(key(selected[journeyIndex],selected[journeyIndex+1]));
  edges.forEach(e=>{const a=nodes.find(n=>n.id===e.a),b=nodes.find(n=>n.id===e.b);if(!a||!b)return;const k=key(e.a,e.b);let cls=blocked.has(k)?'road blocked':e.closed?(activeCrisisFor(k)?'road crisis-road':'road closed-road'):currentLeg.has(k)?'road active current-leg':activeEdges.has(k)?'road active':'road';if(!e.closed&&e.mult>1&&activeCrisisFor(k))cls+=' slow-road';const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
    const la=nodeLL(a),lb=nodeLL(b);L.polyline([la,lb],{className:cls,interactive:false}).addTo(S.layer);
    lmMarker([(la[0]+lb[0])/2,(la[1]+lb[1])/2],`<span class="weight-tag">${e.mult>1?Number(e.w)*e.mult:e.w}</span>`,0).addTo(S.layer)});
  nodes.forEach(n=>{const cls=[n.id===current?'current':'',n.id===start?'start':'',n.id===goal?'destination':''].filter(Boolean).join(' ');const bm=lmMarker(nodeLL(n),`<div class="building ${cls}"><div class="building-icon">${n.icon||'📍'}</div><span class="code">${esc(n.id)}</span><span class="name">${esc(n.name)}</span></div>`,100,placeMode?{interactive:true,draggable:true,title:'Drag to the real position of '+n.name}:null).addTo(S.layer);if(placeMode)bm.on('dragend',()=>{const p=bm.getLatLng();n.lat=+p.lat.toFixed(7);n.lng=+p.lng.toFixed(7);recalcRoadCosts(n.id);save();updateMap();renderEditorMap()})});
  edges.forEach(e=>{if(!e.closed&&!(e.mult>1))return;const k=key(e.a,e.b),c=activeCrisisFor(k);if(!c)return;const a=nodes.find(n=>n.id===e.a),b=nodes.find(n=>n.id===e.b);if(!a||!b)return;const la=nodeLL(a),lb=nodeLL(b);lmMarker([(la[0]+lb[0])/2,(la[1]+lb[1])/2],`<div class="crisis-pin"><span>${DANGER_RE.test(c.type||'')?'🔥':'🚧'}</span><small>${esc(c.type||'Crisis')}</small></div>`,200,{interactive:true,title:crisisText(c)}).addTo(S.layer)});
  if(walkerPos)lmMarker(llOfXY(walkerPos.x,walkerPos.y),'<div class="walker">🚶</div>',300).addTo(S.layer);
}
function resetSimulation(){
  blocked.clear();routes=[];selectedRoute=0;start='';goal='';current='';journeyIndex=0;navigationStarted=false;crisisDone=false;walkerPos=null;trail=[];clearLiveUpdates();
  $('startSelect').value='';$('goalSelect').value='';$('routeSummary').textContent='Select your start and destination.';$('routesList').innerHTML='<div class="empty">Routes will appear here.</div>';$('routeCount').textContent=0;syncWalkButtons();$('currentLocation').textContent='—';$('currentGoal').textContent='—';$('directionBox').innerHTML='<span class="direction-icon">🧭</span><div><small>Next location</small><b>Find a route first</b></div>';$('journeySteps').innerHTML='<div class="empty">Select a route to begin.</div>';$('progressBar').style.width='0';setStatus('ready','READY');updateMap();updateLive();if(typeof renderCost==='function'){costInfo={planned:0,total:0,covered:0,crisis:null,prevTotal:null,oldRemaining:0,newRemaining:0};renderCost()}notify('Navigation reset','Current journey reset. Permanently fixed roads remain protected.','info')}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function suggestedPosition(){
  // Search many possible map positions and choose the clearest one.
  // This lets users add many buildings without overwriting the original layout.
  const candidates=[];
  for(let y=8;y<=92;y+=4) for(let x=6;x<=94;x+=4){
    const p={x,y};
    let minNode=Infinity;
    for(const n of nodes) minNode=Math.min(minNode,distance(p,n));
    let minRoad=Infinity;
    for(const e of edges){
      const a=nodes.find(n=>n.id===e.a), b=nodes.find(n=>n.id===e.b);
      if(!a||!b) continue;
      const vx=b.x-a.x,vy=b.y-a.y,wx=x-a.x,wy=y-a.y;
      const t=Math.max(0,Math.min(1,(wx*vx+wy*vy)/(vx*vx+vy*vy||1)));
      minRoad=Math.min(minRoad,distance(p,{x:a.x+t*vx,y:a.y+t*vy}));
    }
    const border=Math.min(x,100-x,y,100-y);
    const score=minNode*1.7+minRoad*0.8+border*0.08;
    candidates.push({x,y,score,minNode,minRoad});
  }
  candidates.sort((a,b)=>b.score-a.score);
  return candidates[0]||{x:50,y:50};
}
function nextBuildingId(){
  const used=new Set(nodes.map(n=>n.id.toUpperCase()));
  for(let i=1;i<=999;i++){
    const id=`N${i}`;
    if(!used.has(id)) return id;
  }
  return `N${Date.now()%1000}`;
}
function renderEditor(){
  const bl=$('buildingList');
  bl.innerHTML=nodes.map(n=>{
    const custom=!!n.custom;
    return `<div class="item-row"><div><b>${n.icon||'📍'} ${esc(n.id)} — ${esc(n.name)}</b><small>${custom?'Added building':'Original building'} · Position ${Math.round(n.x)}%, ${Math.round(n.y)}%</small></div><button type="button" class="delete-btn" data-delete-node="${esc(n.id)}">Delete</button></div>`;
  }).join('');
  bl.querySelectorAll('[data-delete-node]').forEach(btn=>btn.onclick=()=>deleteNode(btn.dataset.deleteNode));

  const rl=$('roadList');
  rl.innerHTML=edges.map(e=>{
    const custom=!!e.custom;
    return `<div class="item-row"><div><b>${esc(nameOf(e.a))} ↔ ${esc(nameOf(e.b))}</b><small>${custom?'Added road':'Original road'} · Distance / cost: ${e.w}</small></div><div class="item-actions"><span class="route-cost">${e.w}</span><button type="button" class="delete-btn" data-delete-edge="${esc(e.a)}|${esc(e.b)}">Delete</button></div></div>`;
  }).join('');
  rl.querySelectorAll('[data-delete-edge]').forEach(btn=>btn.onclick=()=>deleteEdge(btn.dataset.deleteEdge));
  renderEditorMap();
}
function deleteNode(id){
  const node=nodes.find(n=>n.id===id);
  if(!node)return;
  const connected=edges.filter(e=>e.a===id||e.b===id).length;
  const kind=node.custom?'added':'original';
  const ok=window.confirm(`Delete ${node.name}?\n\nThis will remove this ${kind} building and all ${connected} road(s) connected to it.\n\nYou can use “Restore Sample Campus” later to bring the original campus back.`);
  if(!ok)return;
  nodes=nodes.filter(n=>n.id!==id);
  edges=edges.filter(e=>e.a!==id&&e.b!==id);
  blocked=new Set([...blocked].filter(k=>!k.split('|').includes(id)));
  if(start===id||goal===id){resetSimulation();}
  else {
    routes=[]; selectedRoute=0; navigationStarted=false; journeyIndex=0; current='';
    $('routesList').innerHTML='<div class="empty">Routes will appear here.</div>';$('routeCount').textContent=0;
    $('routeSummary').textContent='Select your start and destination.';
    syncWalkButtons();renderJourney();
  }
  save();renderSelects();renderEditor();updateMap();
  notify('Building removed',`${node.name} and all connected roads were removed. Use Restore Sample Campus if you want the original map back.`,'info');
}
function deleteEdge(edgeKey){
  const [a,b]=edgeKey.split('|');
  const index=edges.findIndex(e=>key(e.a,e.b)===key(a,b));
  if(index<0){toast('Road not found.');return}
  const e=edges[index];
  if(!window.confirm(`Delete road ${nameOf(e.a)} ↔ ${nameOf(e.b)}?\n\nDistance / cost: ${e.w}.\nYou can restore the sample campus later if needed.`))return;
  edges.splice(index,1);blocked.delete(key(a,b));
  routes=[];selectedRoute=0;navigationStarted=false;journeyIndex=0;current='';
  $('routesList').innerHTML='<div class="empty">Routes will appear here.</div>';$('routeCount').textContent=0;
  $('routeSummary').textContent='Select your start and destination.';
  syncWalkButtons();renderJourney();
  save();renderSelects();renderEditor();updateMap();
  notify('Road removed',`${nameOf(a)} ↔ ${nameOf(b)} was removed. The current graph was updated.`,'info');
}
function renderEditorMap(){
  const box=$('editorMap'); if(!box)return;
  const S=getLeafletMap('editorMap',box);if(!S)return;
  S.layer.clearLayers();
  edges.forEach(e=>{const a=nodes.find(n=>n.id===e.a),b=nodes.find(n=>n.id===e.b);if(!a||!b)return;const cls=e.custom?'preview-road custom':'preview-road';const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
    const la=nodeLL(a),lb=nodeLL(b);L.polyline([la,lb],{className:cls,interactive:false}).addTo(S.layer);
    lmMarker([(la[0]+lb[0])/2,(la[1]+lb[1])/2],`<span class="weight-tag">${e.w}</span>`,0).addTo(S.layer)});
  nodes.forEach(n=>lmMarker(nodeLL(n),`<div class="preview-building"><div class="preview-icon">${n.icon||'📍'}</div><span class="preview-code">${esc(n.id)}</span><span class="preview-name">${esc(n.name)}</span></div>`,100).addTo(S.layer));
}
function addNode(){
  const typedId=$('nodeId').value.trim().toUpperCase();
  const id=typedId||nextBuildingId();
  const name=$('nodeName').value.trim();
  const icon=$('nodeIcon').value||'📍';
  if(!/^[A-Z0-9]{1,3}$/.test(id)){toast('Building ID must contain 1–3 letters or numbers.');return}
  if(!name){toast('Enter a building name.');$('nodeName').focus();return}
  if(nodes.some(n=>n.id===id)){toast(`Building ID ${id} already exists. Choose another ID.`);return}
  const pos=suggestedPosition();
  nodes.push({id,name,icon,x:pos.x,y:pos.y,custom:true});
  save();
  renderSelects();
  renderEditor();
  updateMap();
  $('nodeId').value='';
  $('nodeName').value='';
  notify('Building added',`${name} (${id}) was placed at the best available position (${Math.round(pos.x)}%, ${Math.round(pos.y)}%). You can add another building immediately.`,'success');
}
function addEdge(){
  const a=$('edgeFrom').value,b=$('edgeTo').value,w=Number($('edgeWeight').value);
  if(!a||!b){toast('Select both From and To buildings.');return}
  if(a===b){toast('From and To must be different buildings.');return}
  if(!Number.isFinite(w)||w<=0){toast('Enter a positive distance / cost.');return}
  if(edges.some(e=>key(e.a,e.b)===key(a,b))){toast('A road already connects these two buildings.');return}
  edges.push({a,b,w,custom:true});
  save();
  renderSelects();
  // Keep the selected From/To values so another road can be added quickly.
  $('edgeFrom').value=a;
  $('edgeTo').value=b;
  renderEditor();
  updateMap();
  notify('Road added',`${nameOf(a)} ↔ ${nameOf(b)} with cost ${w}. You can add another road immediately.`,'success');
}
function removeAllCustomRoads(){const count=edges.filter(e=>e.custom).length;if(!count){toast('No added roads to remove.');return}if(!window.confirm(`Remove all ${count} added road(s)? Original roads will stay unchanged.`))return;edges=edges.filter(e=>!e.custom);save();renderSelects();renderEditor();updateMap();notify('Added roads removed',`${count} custom road(s) removed. Original roads were kept.`,'info')}
function removeAllCustomBuildings(){const ids=nodes.filter(n=>n.custom).map(n=>n.id);if(!ids.length){toast('No added buildings to remove.');return}if(!window.confirm(`Remove all ${ids.length} added building(s)? Their added roads will also be removed.`))return;const idSet=new Set(ids);nodes=nodes.filter(n=>!n.custom);edges=edges.filter(e=>!e.custom && !idSet.has(e.a) && !idSet.has(e.b));save();renderSelects();renderEditor();updateMap();notify('Added buildings removed',`${ids.length} custom building(s) and their added roads were removed. Original campus was unchanged.`,'info')}

function bindUI(){
  $('dialogOk').onclick=dialogPrimaryAction;
  $('crisisDialog').onclick=e=>{if(e.target.id==='crisisDialog')closeDialog()};
  $('openNavigator').onclick=()=>showPage('navigatorPage');
  $('openEditor').onclick=()=>{const s=getSession();if(s?.role!=='admin'){toast('Campus Setup is available only to the administrator.');return}renderEditor();showPage('editorPage')};
  $('backHome1').onclick=()=>showPage('homePage');
  $('backHome2').onclick=()=>showPage('homePage');
  $('findRoutes').onclick=plan;
  $('startNavBtn').onclick=startNavigation;
  $('nextBtn').onclick=nextStep;
  $('changeRouteBtn').onclick=changeRoute;
  $('addNode').onclick=addNode;
  $('addEdge').onclick=addEdge;
  $('removeAllRoads').onclick=removeAllCustomRoads;
  $('removeAllBuildings').onclick=removeAllCustomBuildings;
  $('resetGraph').onclick=()=>{resetData();renderSelects();renderEditor();resetSimulation();notify('Campus restored','Sample campus restored successfully.','success')};
  $('themeBtn').onclick=()=>{document.body.classList.toggle('dark');localStorage.setItem('ccn_dark',document.body.classList.contains('dark'));$('themeBtn').textContent=document.body.classList.contains('dark')?'☀':'☾'};
}
function init(){
  bindUI();
  if(localStorage.getItem('ccn_dark')==='true'){document.body.classList.add('dark');$('themeBtn').textContent='☀'}
  if(!load())resetData();
  renderSelects();
  renderEditor();
  updateMap();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();

/* ========================= AUTHENTICATION / ADMIN ACCESS =========================
   Demo-friendly browser authentication layer. The original navigation code above
   remains unchanged; this layer only controls access and adds user/admin accounts.
*/
const AUTH_STORAGE='ccn_accounts_v1';
const SESSION_STORAGE='ccn_session_v1';
const DEFAULT_ADMIN={username:'admin',name:'System Administrator',role:'admin',passwordHash:'240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'};
const getAccounts=()=>{try{return JSON.parse(localStorage.getItem(AUTH_STORAGE))||[]}catch(e){return[]}};
const saveAccounts=a=>localStorage.setItem(AUTH_STORAGE,JSON.stringify(a));
const getSession=()=>{try{return JSON.parse(sessionStorage.getItem(SESSION_STORAGE)||localStorage.getItem(SESSION_STORAGE))}catch(e){return null}};
function setSession(user){sessionStorage.setItem(SESSION_STORAGE,JSON.stringify({username:user.username,name:user.name,role:user.role}));}
function clearSession(){sessionStorage.removeItem(SESSION_STORAGE);localStorage.removeItem(SESSION_STORAGE)}
async function hashPassword(value){const data=new TextEncoder().encode(value);const hash=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function authMessage(text,type='error'){const el=$('authMessage');el.textContent=text;el.className='auth-message '+type}
function switchAuthTab(tab){
  document.querySelectorAll('.auth-tab').forEach(b=>b.classList.toggle('active',b.dataset.authTab===tab));
  ['login','signup'].forEach(x=>$(`${x}Form`).classList.toggle('hidden',x!==tab));
  $('authTitle').textContent=tab==='signup'?'Create your account':'Welcome back';
  $('authSubtitle').textContent=tab==='signup'?'Create a campus account with secure username and password rules.':'Sign in to continue to your campus navigation portal.';
  authMessage('');
}
function showAuth(){
  $('authScreen').style.display='grid';
  $('adminPortal').classList.remove('show');
  $('adminPortal').setAttribute('aria-hidden','true');
  switchAuthTab('login');
  const badge=$('accountBadge');if(badge)badge.style.display='none';
  const logout=$('logoutBtn');if(logout)logout.style.display='none';
}
function applyRoleAccess(user){
  const setupCard=$('openEditor');
  if(setupCard){
    setupCard.style.display=user?.role==='admin'?'flex':'none';
    setupCard.setAttribute('aria-hidden', user?.role==='admin'?'false':'true');
  }
}
function showProjectFor(user){
  $('authScreen').style.display='none';
  $('adminPortal').classList.remove('show');
  $('adminPortal').setAttribute('aria-hidden','true');
  const badge=$('accountBadge');
  if(badge){
    badge.textContent=`${user.role==='admin'?'Administrator':'User'} · ${user.name||user.username}`;
    badge.style.display='inline-block';
  }
  const logout=$('logoutBtn');if(logout)logout.style.display='inline-block';
  // Role-based home screen:
  // User = Navigation only. Admin = Navigation + Campus Setup.
  applyRoleAccess(user);
  showPage('homePage');
}

function openAdminPortal(){
  const s=getSession();if(!s||s.role!=='admin'){showAuth();switchAuthTab('login');return}
  $('authScreen').style.display='none';
  $('adminPortal').classList.add('show');
  $('adminPortal').setAttribute('aria-hidden','false');
  renderAdminPortal();
}
function renderAdminPortal(){
  const accounts=getAccounts().filter(a=>a.role!=='admin');
  $('adminUserCount').textContent=accounts.length;
  $('adminBuildingCount').textContent=nodes.length;
  $('adminRoadCount').textContent=edges.length;
  const s=getSession();
  $('adminCurrentAccount').innerHTML=`<b>🛡️ ${esc(s?.name||'Administrator')}</b><small>Username: ${esc(s?.username||'admin')} · Role: Administrator</small>`;
  const box=$('adminUsers');
  if(!accounts.length){box.innerHTML='<div class="empty">No user accounts have been created yet.</div>';return}
  box.innerHTML=accounts.map(a=>`<div class="admin-user-row"><div><b>${esc(a.name)}</b><small>@${esc(a.username)}</small></div><button type="button" data-remove-user="${esc(a.username)}">Remove</button></div>`).join('');
  box.querySelectorAll('[data-remove-user]').forEach(btn=>btn.onclick=()=>removeRegisteredUser(btn.dataset.removeUser));
}
function removeRegisteredUser(username){
  const accounts=getAccounts();
  const user=accounts.find(a=>a.username===username);if(!user)return;
  if(!window.confirm(`Remove the account @${user.username}?`))return;
  saveAccounts(accounts.filter(a=>a.username!==username));
  renderAdminPortal();
}
function validateSignup(name,username,password,confirm){
  if(!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(name))return'Full Name must contain alphabets and spaces only.';
  if(!/^[A-Za-z][A-Za-z0-9_]{3,19}$/.test(username))return'Username must be 4–20 characters, start with a letter, and use only letters, digits or underscore.';
  if(!/[A-Za-z]/.test(password)||!/[0-9]/.test(password)||password.length<8)return'Password must be at least 8 characters and contain both letters and digits.';
  if(password!==confirm)return'Passwords do not match.';
  if(username.toLowerCase()==='admin')return'This username is reserved for the administrator.';
  return'';
}
async function handleSignup(e){
  e.preventDefault();
  const name=$('signupName').value.trim(),username=$('signupUsername').value.trim(),password=$('signupPassword').value,confirm=$('signupConfirm').value;
  const problem=validateSignup(name,username,password,confirm);if(problem){authMessage(problem);return}
  const accounts=getAccounts();
  if(accounts.some(a=>a.username.toLowerCase()===username.toLowerCase())){authMessage('This username is already registered. Choose another username.');return}
  const passwordHash=await hashPassword(password);
  accounts.push({username,name,role:'user',passwordHash,createdAt:new Date().toISOString()});saveAccounts(accounts);
  $('signupForm').reset();
  $('loginForm').reset();
  switchAuthTab('login');
  authMessage('Account created successfully. Please enter your username and password to sign in.','success');
}
async function authenticate(username,password,role){
  const accounts=getAccounts();
  const user=accounts.find(a=>a.username.toLowerCase()===username.toLowerCase()&&a.role===role);
  if(!user)return null;
  const hash=await hashPassword(password);return hash===user.passwordHash?user:null;
}
async function handleLogin(e){
  e.preventDefault();
  const username=$('loginUsername').value.trim();
  const password=$('loginPassword').value;
  const accounts=getAccounts();
  const user=accounts.find(a=>a.username.toLowerCase()===username.toLowerCase());
  if(!user){authMessage('Invalid username or password. Please check your details.');return}
  const hash=await hashPassword(password);
  if(hash!==user.passwordHash){authMessage('Invalid username or password. Please check your details.');return}
  setSession(user);$('loginForm').reset();
  // Both roles enter the same project home screen. The role only controls
  // which project modules are visible: users get Navigation, admins get
  // Navigation + Campus Setup.
  showProjectFor(user);
}
function authLogout(){clearSession();showAuth();$('loginForm').reset();$('signupForm').reset();}
function ensureAdminSeed(){
  const accounts=getAccounts();
  // Always keep the built-in administrator credentials in sync. This also
  // fixes projects that were opened earlier with an older admin password.
  const adminIndex=accounts.findIndex(a=>a.username?.toLowerCase()==='admin' || a.role==='admin');
  if(adminIndex===-1){
    accounts.push({...DEFAULT_ADMIN,createdAt:new Date().toISOString()});
  }else{
    accounts[adminIndex]={...accounts[adminIndex],...DEFAULT_ADMIN,passwordHash:DEFAULT_ADMIN.passwordHash,role:'admin'};
  }
  saveAccounts(accounts);
}
function bindAuthUI(){
  ensureAdminSeed();
  document.querySelectorAll('[data-auth-tab]').forEach(b=>b.onclick=()=>switchAuthTab(b.dataset.authTab));
  document.querySelectorAll('[data-toggle-password]').forEach(btn=>btn.onclick=()=>{const input=$(btn.dataset.togglePassword);const visible=input.type==='text';input.type=visible?'password':'text';btn.textContent=visible?'Show':'Hide'});
  $('signupForm').addEventListener('submit',handleSignup);
  $('loginForm').addEventListener('submit',handleLogin);
  $('logoutBtn').onclick=authLogout;
  $('adminLogout').onclick=authLogout;
  $('adminClose').onclick=()=>{showProjectFor(getSession());showPage('homePage')};
  $('adminOpenNavigator').onclick=()=>{$('adminPortal').classList.remove('show');$('adminPortal').setAttribute('aria-hidden','true');showPage('navigatorPage')};
  $('adminOpenSetup').onclick=()=>{$('adminPortal').classList.remove('show');$('adminPortal').setAttribute('aria-hidden','true');renderEditor();showPage('editorPage')};
  $('adminResetCampus').onclick=()=>{if(!window.confirm('Restore the original 11-building, 21-road sample campus? Custom additions will be removed.'))return;resetData();renderSelects();renderEditor();resetSimulation();renderAdminPortal();notify('Campus restored','Sample campus restored successfully.','success')};
  // Always start with a fresh login screen when the website is opened/refreshed.
  // The previous session is cleared so no username, password, or portal is restored automatically.
  clearSession();
  applyRoleAccess(null);
  $('loginForm').reset();
  $('signupForm').reset();
  showAuth();
  // Browsers/password managers may try to restore saved credentials; clear the fields once after paint.
  setTimeout(()=>{ $('loginUsername').value=''; $('loginPassword').value=''; }, 120);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindAuthUI);else bindAuthUI();

/* ========================= V7 ADDITIONS ========================= */
// --- Admin: close/open road (saved) and edit road cost ---
const _renderEditor=renderEditor;
renderEditor=function(){
  _renderEditor();
  document.querySelectorAll('#roadList .item-row').forEach((row,i)=>{
    const e=edges[i];if(!e)return;const k=`${e.a}|${e.b}`,box=row.querySelector('.item-actions');
    box.insertAdjacentHTML('afterbegin',`<button type="button" class="secondary" data-edit-edge="${esc(k)}">Edit</button><button type="button" class="secondary" data-close-edge="${esc(k)}">${e.closed?'Open':'Close'}</button>`);
    box.querySelector('[data-edit-edge]').onclick=()=>editRoadCost(e);
    box.querySelector('[data-close-edge]').onclick=()=>{e.closed=!e.closed;save();resetSimulation();renderEditor();notify(e.closed?'Road closed':'Road opened',`${nameOf(e.a)} ↔ ${nameOf(e.b)} is now ${e.closed?'closed for everyone':'open'}.`,e.closed?'danger':'success')};
  });
};
function editRoadCost(e){
  const v=Number(window.prompt(`New distance / cost for ${nameOf(e.a)} ↔ ${nameOf(e.b)}:`,e.w));
  if(!Number.isFinite(v)||v<=0){toast('Enter a positive number.');return}
  e.w=v;save();resetSimulation();renderEditor();notify('Road updated',`${nameOf(e.a)} ↔ ${nameOf(e.b)} cost is now ${v}.`,'success');
}
// --- Users: report a blocked road while walking ---
// --- Trip history (per account, shown to admin) + campus export/import ---
const HIST='ccn_history_v1',getHist=()=>{try{return JSON.parse(localStorage.getItem(HIST))||[]}catch(e){return[]}};
const _showDialog=showDialog;
showDialog=function(t,...r){
  _showDialog(t,...r);
  if(String(t).startsWith('Destination reached')&&routes[selectedRoute]){
    const h=getHist(),tr=[...trail];if(tr[tr.length-1]!==nameOf(goal))tr.push(nameOf(goal));h.unshift({user:getSession()?.username||'guest',from:nameOf(start),to:nameOf(goal),route:tr.join(' → '),at:new Date().toLocaleString()});
    try{localStorage.setItem(HIST,JSON.stringify(h.slice(0,300)))}catch(e){}
    renderMyHist();
  }
};
const _renderAdmin=renderAdminPortal;
renderAdminPortal=function(){
  _renderAdmin();const h=getHist();
  $('adminHistory').innerHTML=h.length?h.slice(0,15).map(x=>`<div class="admin-user-row"><div><b>@${esc(x.user)}: ${esc(x.from)} → ${esc(x.to)}</b><small>${esc(x.at)}</small></div></div>`).join(''):'<div class="empty">No journeys completed yet.</div>';
};
function importCampus(file){
  file.text().then(t=>{try{
    const d=JSON.parse(t),ok=Array.isArray(d.nodes)&&Array.isArray(d.edges)&&d.nodes.every(n=>n.id&&n.name&&isFinite(n.x)&&isFinite(n.y))&&d.edges.every(e=>d.nodes.some(n=>n.id===e.a)&&d.nodes.some(n=>n.id===e.b)&&+e.w>0);
    if(!ok)throw 0;nodes=d.nodes;edges=d.edges;blocked.clear();save();renderSelects();renderEditor();resetSimulation();renderAdminPortal();toast('Campus imported.');
  }catch(x){toast('Invalid campus file.')}});
}
function bindV7(){
  
  $('exportBtn').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({nodes,edges},null,1)],{type:'application/json'}));a.download='campus.json';a.click()};
  $('importBtn').onclick=()=>$('importFile').click();
  $('importFile').onchange=e=>{if(e.target.files[0])importCampus(e.target.files[0]);e.target.value=''};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindV7);else bindV7();


/* ========================= V10: FAVORITES, ANNOUNCEMENTS, SHARE ROUTE ========================= */
const NOTICE='ccn_notice_v1';
function renderNotice(){
  let n=null;try{n=JSON.parse(localStorage.getItem(NOTICE))}catch(e){}
  const bar=$('noticeBar');bar.hidden=!n;if(n)bar.innerHTML=`📢 <b>Campus notice:</b> ${esc(n.text)} <small>(${esc(n.at)})</small>`;
}
function postNotice(){
  const t=$('noticeText').value.trim();if(!t){toast('Type a notice first.');return}
  localStorage.setItem(NOTICE,JSON.stringify({text:t,at:new Date().toLocaleString()}));$('noticeText').value='';renderNotice();toast('Notice posted for all users.');
}
function bindV10(){
  $('clearMyHist').onclick=()=>{const me=getSession()?.username||'guest';localStorage.setItem(HIST,JSON.stringify(getHist().filter(x=>x.user!==me)));renderMyHist();toast('Your history was cleared.')};
  $('postNotice').onclick=postNotice;$('clearNotice').onclick=()=>{localStorage.removeItem(NOTICE);renderNotice();toast('Notice cleared.')};
  $('openNavigator').addEventListener('click',()=>{renderNotice();renderMyHist()});renderNotice();renderMyHist();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindV10);else bindV10();

function renderMyHist(){
  const me=getSession()?.username||'guest',h=getHist().filter(x=>x.user===me);
  $('myHistCount').textContent=h.length;
  $('myHistList').innerHTML=h.length?h.map((x,i)=>`<div class="admin-user-row"><div><b>${h.length-i}. ${esc(x.from)} → ${esc(x.to)}</b><small>${esc(x.route)} · ${esc(x.at)}</small></div></div>`).join(''):'<div class="empty">No completed journeys yet. Reach a destination and it will appear here.</div>';
}

/* ========================= V12: REPORT AN ISSUE (user -> admin) ========================= */
const REP='ccn_reports_v2',getReps=()=>{try{return JSON.parse(localStorage.getItem(REP))||[]}catch(e){return[]}},setReps=r=>{try{localStorage.setItem(REP,JSON.stringify(r.slice(0,200)))}catch(e){}};
const repEdge=r=>{const [a,b]=r.road.split('|');return edges.find(e=>key(e.a,e.b)===key(a,b))};
const repLabel=r=>{const [a,b]=r.road.split('|');return `${nameOf(a)} ↔ ${nameOf(b)}`};
function fillRepRoads(){const el=$('repRoad');if(!el)return;el.innerHTML=edges.map(e=>`<option value="${esc(e.a)}|${esc(e.b)}">${esc(nameOf(e.a))} ↔ ${esc(nameOf(e.b))}</option>`).join('')}
function sendReport(){
  const road=$('repRoad').value;if(!road){toast('Choose a road.');return}
  const fk=key(...road.split('|')),r=getReps();
  // A road that an administrator has already fixed is permanently resolved.
  if(getFixedRoads().includes(fk)){toast('This road was already fixed by the administrator. It will not be reported again.');return}
  // Do not create duplicate active reports for the same road.
  if(r.some(x=>x.road&&key(...x.road.split('|'))===fk&&(x.status==='Open'||x.status==='Road closed'))){toast('This road already has an active report.');return}
  r.unshift({id:Date.now(),user:getSession()?.username||'guest',road,type:$('repType').value,note:$('repNote').value.trim(),at:new Date().toLocaleString(),status:'Open'});
  setReps(r);$('repNote').value='';renderMyReports();toast('Report sent to admin.');
}
function renderMyReports(){
  const box=$('myRepList');
  if(!box)return;
  const me=getSession()?.username||'guest',r=getReps().filter(x=>x.user===me);
  box.innerHTML=r.length?r.map(x=>`<div class="admin-user-row"><div><b>${esc(repLabel(x))} — ${esc(x.type)}<span class="badge ${esc(x.status)}">${esc(x.status)}</span></b><small>Automatically reported while walking · ${esc(x.note||'No additional note')} · ${esc(x.at)}</small></div></div>`).join(''):'<div class="empty">No automatic issues have been recorded for your journeys yet.</div>';
}
function renderAdminReports(){
  const r=getReps();
  const open=r.filter(x=>x.status==='Open'||x.status==='Road closed').length;
  const badge=$('adminRepBadge');if(badge)badge.textContent=open;
  const box=$('adminReports');
  if(box)box.innerHTML=`<div class="report-admin-summary"><b>${open} active issue${open===1?'':'s'}</b><span>All automatic walker reports are managed in the single Crisis Manager table.</span></div>`;
}
function actOnReport(id,act){
  const reps=getReps(),x=reps.find(q=>q.id===id);if(!x)return;const e=repEdge(x),fk=key(...x.road.split('|'));
  // Once fixed, the road is locked as permanently resolved.
  if(getFixedRoads().includes(fk)||x.status==='Fixed'){toast('This road is already fixed permanently.');return}
  if(act==='close'){
    if(getFixedRoads().includes(fk)){toast('This road is permanently fixed and cannot be closed by an old report.');return}
    if(!e){toast('That road no longer exists.');return}
    e.closed=true;save();reps.forEach(q=>{if(q.road&&key(...q.road.split('|'))===fk&&(q.status==='Open'))q.status='Road closed'});
    notify('Road closed',`${repLabel(x)} is closed after the reported issue.`,'danger')
  }
  if(act==='fixed'){if(e&&e.closed){e.closed=false;save()}blocked.delete(fk);setFixedRoads([...new Set([...getFixedRoads(),fk])]);x.status='Fixed';reps.forEach(q=>{if(q.road&&key(...q.road.split('|'))===fk&&(q.status==='Open'||q.status==='Road closed'))q.status='Fixed'});notify('Issue fixed',`${repLabel(x)} is fixed permanently and will not appear as a new crisis again.`,'success')}
  if(act==='reject'){x.status='Rejected';const still=reps.some(q=>q!==x&&q.road&&key(...q.road.split('|'))===fk&&(q.status==='Open'||q.status==='Road closed'));if(e&&!still&&e.closed){e.closed=false;save()}notify('Report rejected',`${repLabel(x)} can have a crisis again.`,'info')}
  setReps(reps);syncFixed(reps);resetSimulation();renderEditor();renderAdminReports();
}
const _renderAdmin2=renderAdminPortal;renderAdminPortal=function(){_renderAdmin2();renderAdminReports()};
function bindV12(){
  // User-side issue reporting is automatic. There is intentionally no
  // manual "send report" form: walking crises are logged by the system.
  const shortcut=$('adminReportsShortcut');
  if(shortcut)shortcut.onclick=()=>{renderCrisisLog();showPage('reportsPage')};
  $('openNavigator').addEventListener('click',()=>renderMyReports());
  renderMyReports();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindV12);else bindV12();

/* ========================= V13: CRISIS REASONS + SPOKEN REROUTE, ADMIN REPORTS BLOCK ========================= */
const CRISIS_REASONS=['a big crowd of students coming','a flood','a fire','a road accident','a fallen tree','a gas leak','construction work','a burst water pipe','a security roadblock'];let lastReason='';
function pickReason(){let r;do{r=CRISIS_REASONS[Math.floor(Math.random()*CRISIS_REASONS.length)]}while(r===lastReason);lastReason=r;return r}
let crisisInfo=null,crisisSpoke=false;
function rerouteMessage(newPath){
  const ci=crisisInfo,why=ci?`The road from ${nameOf(ci.a)} to ${nameOf(ci.b)} is blocked because of ${ci.reason}. `:'';
  const m=ci&&ci.old?`${why}You are at ${nameOf(current)}. I have changed your route from ${ci.old} to ${newPath}.`:`${why}You are at ${nameOf(current)}. Please follow the new route: ${newPath}.`;
  say((ci&&ci.danger?'Danger! ':'')+m.replace(/ → /g,', then '),true);return m;
}
function bindV13(){
  const refresh=()=>{renderNotice();renderMyHist();fillRepRoads();renderMyReports()};
  $('adminOpenNavigator').addEventListener('click',refresh);
  $('adminOpenReports').onclick=()=>{$('adminPortal').classList.remove('show');$('adminPortal').setAttribute('aria-hidden','true');renderCrisisLog();showPage('reportsPage')};
  renderAdminReports();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindV13);else bindV13();


/* ========================= V14: JOURNEY COST CARD (planned vs new cost after crisis) ========================= */
let costInfo={planned:0,total:0,covered:0,crisis:null,prevTotal:null,oldRemaining:0,newRemaining:0};
const edgeW=(a,b)=>{const e=edges.find(x=>key(x.a,x.b)===key(a,b));return e?+e.w:0};
function renderCost(){
  const c=costInfo,box=$('costBody');if(!box)return;
  if(!routes.length){box.innerHTML='<div class="empty">Find a route to see its cost.</div>';return}
  const row=(l,v,cls='')=>`<div class="cost-row ${cls}"><span>${l}</span><b>${v}</b></div>`;
  if(!c.crisis){box.innerHTML=row('Expected total cost',c.planned||routes[selectedRoute]?.cost||0,'strong');return}
  const x=c.total-c.planned;
  box.innerHTML=`<div class="cost-alert">⚠ Road blocked: ${esc(nameOf(c.crisis.a))} ↔ ${esc(nameOf(c.crisis.b))} (${esc(c.crisis.reason)})</div>`
    +row('Expected total cost (before)',c.planned)+row('New total cost (after crisis)',c.total,'strong')+row('Extra cost due to this crisis',(x>0?'+':'')+x,x>0?'bad':'good');
}

/* ========================= V15: AUTO-REPORT OF CRISES TO ADMIN + ADMIN "USER REPORTS" PAGE ========================= */
function logAutoReport(){
  const ci=crisisInfo;if(!ci||ci.fromAdmin)return;
  const fk=key(ci.a,ci.b),r=getReps();
  // Never recreate a report for a road already fixed by the administrator.
  if(getFixedRoads().includes(fk))return;
  // One active report per road prevents the same crisis appearing twice.
  if(r.some(x=>x.road&&key(...x.road.split('|'))===fk&&(x.status==='Open'||x.status==='Road closed'||x.status==='Fixed')))return;
  r.unshift({id:Date.now(),user:getSession()?.username||'guest',road:`${ci.a}|${ci.b}`,type:ci.reason.replace(/^an? /,'').replace(/^./,c=>c.toUpperCase()),note:`Faced while walking ${nameOf(start)} → ${nameOf(goal)}. User was at ${nameOf(current)}. Road stays closed until the admin fixes it.`,at:new Date().toLocaleString(),status:'Road closed',auto:true,slow:!!ci.slow,danger:!!ci.danger});
  setReps(r);
  renderMyReports();
  renderAdminReports();
  if(typeof renderCrisisLog==='function' && getSession()?.role==='admin')renderCrisisLog();
}
function renderReportsPage(){
  const r=getReps(),open=r.filter(x=>x.status==='Open'||x.status==='Road closed').length;
  $('homeRepBadge').textContent=open;$('repPageOpen').textContent=open;
  $('reportsPageList').innerHTML=r.length?r.map(x=>`<div class="admin-user-row"><div><b>@${esc(x.user)}: ${esc(x.type)} — ${esc(repLabel(x))}<span class="badge ${esc(x.status)}">${esc(x.status)}</span>${x.auto?'<span class="badge">Faced while walking</span>':''}</b><small>${esc(x.note||'No note')} · ${esc(x.at)}</small>${true?`<div class="rep-act"><button class="secondary" data-rep="close" data-id="${x.id}">Close road</button><button class="secondary" data-rep="fixed" data-id="${x.id}">Mark fixed</button><button class="secondary" data-rep="reject" data-id="${x.id}">Reject</button></div>`:''}</div></div>`).join(''):'<div class="empty">No problems reported by users yet.</div>';
}
const _aor=actOnReport;actOnReport=function(id,act){_aor(id,act);renderReportsPage()};
const _spf=showProjectFor;showProjectFor=function(u){_spf(u);$('openReports').hidden=u.role!=='admin';renderReportsPage()};
function bindV15(){
  $('openReports').onclick=()=>{renderReportsPage();showPage('reportsPage')};
  $('backHome3').onclick=()=>showPage('homePage');
  $('reportsPageList').addEventListener('click',ev=>{const b=ev.target.closest('[data-rep]');if(b)actOnReport(+b.dataset.id,b.dataset.rep)});
  renderReportsPage();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindV15);else bindV15();

/* ===== V16: final cost summary at arrival (expected, new, extra) ===== */
const _sd16=showDialog;
showDialog=function(t,tx,...r){
  if(String(t).startsWith('Destination reached')){
    const c=costInfo,x=c.total-c.planned,sum=c.crisis?`Expected total cost: ${c.planned}. New total cost after the crisis: ${c.total}. Extra cost due to the crisis: ${x>0?'+':''}${x}.`:`Expected total cost: ${c.planned}. No crisis happened, so there is no extra cost.`;
    tx=`You have safely reached ${nameOf(goal)}. ${sum}`;say(sum,true);
  }
  _sd16(t,tx,...r);
};

/* ===== V17b: fixed roads stay open; OK / closing the popup silences the voice ===== */
const FIXED_KEY='ccn_fixed_roads_v2';
function getFixedRoads(){try{const a=JSON.parse(localStorage.getItem(FIXED_KEY));return Array.isArray(a)?[...new Set(a.map(String))]:[]}catch(e){return[]}}
function setFixedRoads(a){try{localStorage.setItem(FIXED_KEY,JSON.stringify([...new Set((a||[]).map(String))]))}catch(e){}}
function isPermanentlyFixedRoad(a,b){return getFixedRoads().includes(key(a,b))}
document.addEventListener('click',ev=>{if(!(ev.target.closest('#dialogOk')||ev.target.id==='crisisDialog'))return;const tag=$('dialogTag');/* keep safety / route-change announcements playing so the walker hears the new route */if(tag&&tag.textContent==='SAFETY ALERT')return;stopSpeech()},true);
document.addEventListener('keydown',ev=>{if(ev.key==='Escape')stopSpeech()});
window.addEventListener('beforeunload',()=>{try{stopSpeech()}catch(e){}});

/* ===== V20: admin Crisis Manager (full control: add, edit, fix, reject, delete) ===== */
const DANGER_RE=/fire|flood|accident|gas|damag|collapse/i;
let editingCrisis=null;
const rk=r=>key(...r.road.split('|'));
const isDanger=x=>x.danger!==undefined?x.danger:DANGER_RE.test(x.type||'');
const srcOf=x=>x.admin?'Admin':x.auto?'Walker':'User report';
const lvl=x=>isDanger(x)?'<span class="lvl danger">Dangerous</span>':'<span class="lvl">Blocked</span>';
const CRISIS_TYPES=['Road blocked','Fire','Flood','Road damaged','Accident','Gas leak','Fallen tree','Construction work','Burst water pipe','Big crowd of students'];
function syncFixed(reps){
  // Fixed roads are permanent. Once an administrator fixes a road,
  // deleting/clearing its report records must NOT make it eligible again.
  const existing=getFixedRoads();
  const newlyFixed=reps.filter(x=>x.status==='Fixed').map(rk);
  setFixedRoads([...new Set([...existing,...newlyFixed])]);
}
function fillCrisisRoads(){const sel=$('cAddRoad');if(!sel)return;const v=sel.value;sel.innerHTML=edges.map(e=>`<option value="${esc(e.a)}|${esc(e.b)}">${esc(nameOf(e.a))} ↔ ${esc(nameOf(e.b))}</option>`).join('');if(v)sel.value=v}
function addCrisis(){
  const road=$('cAddRoad').value,type=$('cAddType').value,note=$('cAddNote').value.trim();if(!road){toast('Choose a road.');return}
  const [a,b]=road.split('|'),e=edges.find(q=>key(q.a,q.b)===key(a,b));if(!e){toast('That road no longer exists.');return}
  const reps=getReps(),fk=key(a,b);
  if(getFixedRoads().includes(fk)){toast('That road was permanently fixed and cannot receive a new crisis.');return}
  if(reps.some(q=>rk(q)===fk&&(q.status==='Open'||q.status==='Road closed'))){toast('This road already has an active issue.');return}
  reps.unshift({id:Date.now(),user:getSession()?.username||'admin',road,type,note:note||'Added by admin',at:new Date().toLocaleString(),status:'Road closed',admin:true,danger:DANGER_RE.test(type)});
  e.closed=true;save();setReps(reps);syncFixed(reps);$('cAddNote').value='';resetSimulation();renderEditor();renderReportsPage();renderAdminReports();toast(`${type} added. Road closed for everyone.`)
}
function deleteCrisis(id){
  const reps=getReps(),i=reps.findIndex(q=>q.id===id);if(i<0)return;
  const x=reps[i],k=rk(x);
  reps.splice(i,1);
  const e=repEdge(x),stillClosed=reps.some(q=>rk(q)===k&&(q.status==='Open'||q.status==='Road closed'));
  if(e&&!getFixedRoads().includes(k)){e.closed=stillClosed;save()}
  setReps(reps);syncFixed(reps);resetSimulation();renderEditor();renderReportsPage();renderAdminReports()
}
function clearRoad(k){
  const reps=getReps(),keep=reps.filter(q=>rk(q)!==k);setReps(keep);
  const e=edges.find(q=>key(q.a,q.b)===k);
  // Delete records, but keep a previously fixed road permanently resolved.
  if(e&&!getFixedRoads().includes(k)){e.closed=false;save()}
  syncFixed(keep);resetSimulation();renderEditor();renderReportsPage();renderAdminReports()
}
function fixRoad(k){
  const reps=getReps(), matches=reps.filter(q=>rk(q)===k);
  if(!matches.length){toast('No report exists for this road.');return}
  const e=edges.find(q=>key(q.a,q.b)===k);
  if(e){e.closed=false;save()}
  matches.forEach(q=>{q.status='Fixed'});
  setFixedRoads([...new Set([...getFixedRoads(),k])]);
  setReps(reps);
  resetSimulation();renderEditor();renderReportsPage();renderAdminReports();
  toast(`${repLabel(matches[0])} fixed permanently. It will not be reported as a new crisis again.`);
}
function saveCrisisEdit(id){
  const reps=getReps(),x=reps.find(q=>q.id===id);if(!x)return;const t=$('cEditType').value,n=$('cEditNote').value.trim();
  x.type=t;x.danger=DANGER_RE.test(t);x.note=n||x.note;editingCrisis=null;setReps(reps);renderReportsPage();renderAdminReports()
}
function renderCrisisLog(){
  const box=$('crisisLog');if(!box)return;fillCrisisRoads();
  const list=getReps(),fixed=getFixedRoads();
  const activeN=list.filter(x=>x.status==='Open'||x.status==='Road closed').length;
  const fixedN=list.filter(x=>x.status==='Fixed').length;
  const dangerN=list.filter(isDanger).length;
  const rows=list.slice(0,200).map(x=>{
    const fk=rk(x),isFixed=fixed.includes(fk)||x.status==='Fixed';
    if(editingCrisis===x.id)return `<tr><td>${esc(repLabel(x))}</td><td><select id="cEditType">${CRISIS_TYPES.map(t=>`<option${t===x.type?' selected':''}>${t}</option>`).join('')}${CRISIS_TYPES.includes(x.type)?'':`<option selected>${esc(x.type)}</option>`}</select></td><td colspan="3"><input id="cEditNote" value="${esc(x.note||'')}" maxlength="80"></td><td>${srcOf(x)}</td><td class="act"><button class="primary" data-cl="save" data-id="${x.id}">Save</button><button class="secondary" data-cl="cancel">Cancel</button></td></tr>`;
    const actions=isFixed
      ? `<span class="fixed-lock">✓ Permanently fixed</span><button class="secondary" data-cl="delete" data-id="${x.id}">Delete</button>`
      : `<button class="secondary" data-cl="edit" data-id="${x.id}">Edit</button><button class="secondary" data-cl="fixed" data-id="${x.id}">Fix</button><button class="secondary" data-cl="close" data-id="${x.id}">Close road</button><button class="secondary" data-cl="delete" data-id="${x.id}">Delete</button>`;
    return `<tr><td><b>${esc(repLabel(x))}</b></td><td>${esc(x.type)}<small>${esc(x.note||'No additional note')}</small></td><td>${lvl(x)}</td><td>${srcOf(x)} · @${esc(x.user||'guest')}</td><td>${esc(x.at)}</td><td><span class="badge ${esc(x.status)}">${esc(x.status)}</span></td><td class="act">${actions}</td></tr>`;
  }).join('');
  box.innerHTML=`<div class="crisis-log">
    <h3>All issues · one control table <small>Automatic walker reports appear here without any manual user submission.</small></h3>
    <div class="crisis-stats"><div><b>${list.length}</b><span>Total issues</span></div><div><b>${activeN}</b><span>Active now</span></div><div><b>${dangerN}</b><span>Dangerous</span></div><div><b>${fixedN}</b><span>Fixed</span></div></div>
    ${list.length?`<div class="crisis-scroll holistic"><table><thead><tr><th>Road</th><th>Issue</th><th>Level</th><th>Source</th><th>Reported</th><th>Status</th><th>Admin actions</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="subtext">An active crisis keeps its road closed for everyone until the admin presses Fix. Fix reopens the road permanently and prevents future automatic crises on it. Delete also removes the crisis and reopens the road. All administrator actions are handled in this single table.</p>`:'<div class="empty">No issues yet. If a crisis happens while a user is walking, it will appear here automatically.</div>'}
  </div>`;
}
const _rrp20=renderReportsPage;renderReportsPage=function(){_rrp20();renderCrisisLog()};
function bindV20(){
  if($('cAddBtn'))$('cAddBtn').onclick=addCrisis;
  const shortcut=$('adminReportsShortcut');
  if(shortcut)shortcut.onclick=()=>{renderCrisisLog();showPage('reportsPage')};
  $('crisisLog').addEventListener('click',ev=>{
    const b=ev.target.closest('[data-cl]');if(!b)return;const a=b.dataset.cl,id=+b.dataset.id;
    if(a==='edit'){editingCrisis=id;renderCrisisLog()}
    else if(a==='cancel'){editingCrisis=null;renderCrisisLog()}
    else if(a==='save')saveCrisisEdit(id);
    else if(a==='delete'){if(confirm('Archive this crisis? It leaves the list, stays in History, and its road reopens.'))deleteCrisis(id)}
    else if(a==='clearroad'){if(confirm('Delete every record of this road?'))clearRoad(b.dataset.road)}
    else if(a==='fixroad')fixRoad(b.dataset.road);
    else actOnReport(id,a);
  });
  fillCrisisRoads();renderCrisisLog();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindV20);else bindV20();

/* ===== V21: hybrid crisis logic (admin crises + optional random simulation) + live updates ===== */
const SIM_KEY='ccn_sim_v2';
const simOn=()=>{try{return localStorage.getItem(SIM_KEY)!=='off'}catch(e){return true}};
const _ac21=automaticCrisis;automaticCrisis=function(){if(!simOn())return false;return _ac21()};
const PHRASE={'Road blocked':'a roadblock','Fire':'a fire','Flood':'a flood','Road damaged':'road damage','Accident':'an accident','Gas leak':'a gas leak','Fallen tree':'a fallen tree','Construction work':'construction work','Burst water pipe':'a burst water pipe','Big crowd of students':'a big crowd of students'};
const phraseOf=t=>PHRASE[t]||String(t||'a crisis').toLowerCase();
function renderAlerts(){
  const bar=$('alertBar');if(!bar)return;
  const act=getReps().filter(x=>x.status==='Road closed'&&repEdge(x)&&repEdge(x).closed);
  if(!act.length){bar.hidden=true;bar.innerHTML='';return}
  bar.hidden=false;bar.innerHTML='<b>⚠ Active campus alerts (roads closed until fixed)</b>'+act.slice(0,6).map(x=>`<span>${isDanger(x)?'🔥':'🚧'} ${esc(x.type)} — ${esc(repLabel(x))}</span>`).join('')+(act.length>6?`<span>+${act.length-6} more</span>`:'');
}
const _um21=updateMap;updateMap=function(){_um21();renderAlerts()};
function liveAdminCheck(){
  /* an admin closed a road in another tab: react like a real crisis */
  const path=routes[selectedRoute]?.path;
  if(!navigationStarted||!path){if(routes.length&&start&&goal&&!navigationStarted){quietPlan()}else{updateMap()}return}
  for(let i=journeyIndex;i<path.length-1;i++){
    const e=edges.find(q=>key(q.a,q.b)===key(path[i],path[i+1]));
    if(e&&e.closed){
      const rec=getReps().find(x=>x.status==='Road closed'&&rk(x)===key(e.a,e.b)),type=rec?rec.type:'Road blocked',reason=phraseOf(type),danger=DANGER_RE.test(type);
      crisisInfo={a:path[i],b:path[i+1],reason,old:path.slice(journeyIndex).map(nameOf).join(' → '),danger,fromAdmin:true};crisisDone=true;
      const verdict=danger?'It is not safe.':'You cannot pass.',msg=`Admin update: the road ${nameOf(path[i])} to ${nameOf(path[i+1])} on your route is now closed because of ${reason}. ${verdict} Finding a new route from ${nameOf(current)}.`;
      crisisSpoke=true;say(`Admin update. ${danger?'Danger! ':''}The road ${nameOf(path[i])} to ${nameOf(path[i+1])} on your route is closed because of ${reason}. ${verdict} Finding a new route.`);
      notify('Road closed by admin',msg,'danger');setStatus('danger','ROAD CLOSED');updateMap();showDialog('Road closed by admin 🚨',msg,'danger','Recalculating from: '+nameOf(current)+' → '+nameOf(goal));
      setTimeout(()=>rerouteFromCurrent(true),500);return
    }
  }
  updateMap();
}
window.addEventListener('storage',ev=>{
  if(ev.key===STORAGE&&ev.newValue){try{const d=JSON.parse(ev.newValue);edges.forEach(e=>{const n=(d.edges||[]).find(q=>key(q.a,q.b)===key(e.a,e.b));e.closed=!!(n&&n.closed);e.mult=(n&&n.mult)||1});liveAdminCheck()}catch(e){}}
  else if(ev.key===REP){renderAlerts();if(typeof renderReportsPage==='function'&&getSession()?.role==='admin')renderReportsPage()}
});
function bindV21(){
  const t=$('simToggle');if(t){t.checked=simOn();t.onchange=()=>{try{localStorage.setItem(SIM_KEY,t.checked?'on':'off')}catch(e){}toast(t.checked?'Simulation mode ON: random crises can happen while users walk.':'Simulation mode OFF: only crises added by the admin happen.')}}
  const ob=$('openNavigator');if(ob)ob.addEventListener('click',()=>renderAlerts());renderAlerts();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindV21);else bindV21();



/* ===== V22: permanent crisis warning on the route page + migration of old 'Open' walker reports ===== */
function renderCrisisWarn(){
  let box=$('crisisWarn');
  if(!box){const anchor=$('routeSummary');if(!anchor)return;box=document.createElement('div');box.id='crisisWarn';box.className='crisis-warn';box.hidden=true;anchor.insertAdjacentElement('afterend',box)}
  const cw=(start&&goal)?crisisOnWay(start,goal):null;
  if(!cw||!cw.c){box.hidden=true;box.innerHTML='';return}
  box.hidden=false;box.innerHTML='<b>🚨 Active crisis on this way</b><span>'+esc(crisisText(cw.c))+' Same for every user.</span>';
}
const _um22=updateMap;updateMap=function(){_um22();renderCrisisWarn()};
const _plan22=plan;plan=function(){_plan22();renderCrisisWarn()};
function migrateOpenCrises(){
  // Reports saved by the older version stayed 'Open' while the road was still walkable. Close those roads now.
  try{
    const reps=getReps(),fixed=getFixedRoads();let changed=false;
    reps.forEach(x=>{
      if(!x.road||x.status!=='Open')return;
      const k=rk(x),e=edges.find(q=>key(q.a,q.b)===k);
      if(!e||fixed.includes(k))return;
      applySeverity(e,x.type);x.slow=isSlowType(x.type);x.status='Road closed';changed=true;
    });
    if(changed){save();setReps(reps);updateMap();if(typeof renderCrisisLog==='function')renderCrisisLog()}
  }catch(err){}
}
function bindV22(){migrateOpenCrises();renderCrisisWarn()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindV22);else bindV22();


/* ========================= V23: severity (closed / slow), critical roads (DFS), Reopen vs Fix, history ========================= */
const SLOW_MULT=3;
const isSlowType=t=>/crowd|construction/i.test(t||'');          // slow: still passable, distance x3
const slowOf=x=>x.slow!==undefined?x.slow:isSlowType(x.type);
const isActive=x=>x.status==='Open'||x.status==='Road closed';
const adminName=()=>getSession()?.username||'admin';
function applySeverity(e,type){if(isSlowType(type)){e.closed=false;e.mult=SLOW_MULT}else{e.closed=true;e.mult=1}}
function clearSeverity(e){e.closed=false;e.mult=1}
function endCrisis(x,status){x.status=status;x.endedAt=Date.now();x.endedBy=adminName()}
function fmtDur(ms){const m=Math.max(0,Math.round(ms/60000));if(m<1)return 'under 1 min';if(m<60)return m+' min';const h=Math.floor(m/60);return h<24?h+' h '+(m%60)+' min':Math.floor(h/24)+' d '+(h%24)+' h'}

// Slow roads count more in every route calculation (Floyd-Warshall and DFS both read this list).
openEdges=function(extra=new Set()){const b=new Set([...blocked,...extra]);return edges.filter(e=>!b.has(key(e.a,e.b))&&!e.closed).map(e=>e.mult>1?{...e,w:Number(e.w)*e.mult}:e)};

// DFS low-link: a road is CRITICAL (a bridge) when closing it would cut part of the campus off.
function criticalRoads(){
  const adj=new Map(nodes.map(n=>[n.id,[]]));
  edges.filter(e=>!e.closed).forEach(e=>{const k=key(e.a,e.b);adj.get(e.a)?.push({to:e.b,k});adj.get(e.b)?.push({to:e.a,k})});
  const disc=new Map(),low=new Map(),res=new Set();let t=0;
  const dfs=(u,pk)=>{disc.set(u,++t);low.set(u,t);for(const {to,k} of adj.get(u)||[]){if(k===pk)continue;if(!disc.has(to)){dfs(to,k);low.set(u,Math.min(low.get(u),low.get(to)));if(low.get(to)>disc.get(u))res.add(k)}else low.set(u,Math.min(low.get(u),disc.get(to)))}};
  nodes.forEach(n=>{if(!disc.has(n.id))dfs(n.id,null)});
  return res;
}

crisisText=function(c){const [a,b]=c.road.split('|'),why=typeof phraseOf==='function'?phraseOf(c.type):String(c.type||'a crisis').toLowerCase();
  return slowOf(c)?`Road ${nameOf(a)} ↔ ${nameOf(b)} is slow (distance ×${SLOW_MULT}) because of ${why}. It stays that way until the admin fixes it.`
    :`Road ${nameOf(a)} ↔ ${nameOf(b)} is closed because of ${why}. It stays closed until the admin fixes it.`};
crisisOnWay=function(s,g){
  const ks=new Set(edges.filter(e=>(e.closed||e.mult>1)&&activeCrisisFor(key(e.a,e.b))).map(e=>key(e.a,e.b)));
  if(!ks.size)return null;
  const p=floydShortestPath(s,g,edges.filter(e=>!e.closed||ks.has(key(e.a,e.b))));
  for(let i=0;i<p.path.length-1;i++){const k=key(p.path[i],p.path[i+1]);if(ks.has(k))return {k,c:activeCrisisFor(k),a:p.path[i],b:p.path[i+1]}}
  return null;
};
renderAlerts=function(){
  const bar=$('alertBar');if(!bar)return;
  const act=getReps().filter(x=>x.status==='Road closed'&&repEdge(x)&&(repEdge(x).closed||repEdge(x).mult>1));
  if(!act.length){bar.hidden=true;bar.innerHTML='';return}
  bar.hidden=false;bar.innerHTML='<b>⚠ Active campus alerts (until fixed)</b>'+act.slice(0,6).map(x=>`<span>${isDanger(x)?'🔥':'🚧'} ${esc(x.type)} — ${esc(repLabel(x))}${slowOf(x)?' (slow ×'+SLOW_MULT+')':''}</span>`).join('')+(act.length>6?`<span>+${act.length-6} more</span>`:'');
};

// "Fixed" roads are protected from random crises; the admin can remove that protection again.
syncFixed=function(reps){const nf=(reps||[]).filter(x=>x.status==='Fixed'&&!x.protectionRemoved&&x.road).map(rk);setFixedRoads([...new Set([...getFixedRoads(),...nf])])};
function unprotectRoad(reps,k){setFixedRoads(getFixedRoads().filter(f=>f!==k));reps.forEach(q=>{if(q.road&&rk(q)===k&&q.status==='Fixed')q.protectionRemoved=true})}
function refresh23(){resetSimulation();renderEditor();renderReportsPage();renderAdminReports()}

actOnReport=function(id,act){
  const reps=getReps(),x=reps.find(q=>q.id===id);if(!x||!x.road)return;
  const e=repEdge(x),fk=rk(x),prot=getFixedRoads().includes(fk);
  const others=reps.filter(q=>q!==x&&q.road&&rk(q)===fk&&isActive(q));
  if(act==='unprotect'){unprotectRoad(reps,fk);notify('Protection removed',`${repLabel(x)} can have crises again.`,'info')}
  else if(act==='fixed'){
    if(prot&&x.status==='Fixed'){toast('This road is already fixed permanently.');return}
    if(e)clearSeverity(e);
    save();blocked.delete(fk);setFixedRoads([...new Set([...getFixedRoads(),fk])]);
    [x,...others].forEach(q=>{if(q===x||isActive(q))endCrisis(q,'Fixed');q.protectionRemoved=false});
    notify('Issue fixed',`${repLabel(x)} is open for everyone and protected from new random crises.`,'success');
  }else if(act==='reopen'){
    if(!isActive(x)){toast('This issue is already finished.');return}
    [x,...others].forEach(q=>endCrisis(q,'Reopened'));
    if(e&&!prot)clearSeverity(e);
    save();blocked.delete(fk);
    notify('Road reopened',`${repLabel(x)} is open again. It can have a new crisis later.`,'success');
  }else if(act==='reject'){
    if(!isActive(x)){toast('This issue is already finished.');return}
    endCrisis(x,'Rejected');
    if(e&&!others.length&&!prot){clearSeverity(e);save()}
    notify('Report rejected',`${repLabel(x)} can have a crisis again.`,'info');
  }else if(act==='close'){
    if(prot){toast('This road is permanently fixed. Remove protection first.');return}
    if(!e){toast('That road no longer exists.');return}
    if(!isActive(x)){toast('This issue is already finished.');return}
    e.closed=true;e.mult=1;x.slow=false;save();
    notify('Road closed',`${repLabel(x)} is fully closed until it is fixed.`,'danger');
  }else return;
  setReps(reps);syncFixed(reps);refresh23();
};

addCrisis=function(){
  const road=$('cAddRoad').value,type=$('cAddType').value,note=$('cAddNote').value.trim();if(!road){toast('Choose a road.');return}
  const [a,b]=road.split('|'),e=edges.find(q=>key(q.a,q.b)===key(a,b));if(!e){toast('That road no longer exists.');return}
  const reps=getReps(),fk=key(a,b);
  if(reps.some(q=>q.road&&rk(q)===fk&&isActive(q))){toast('This road already has an active issue.');return}
  if(getFixedRoads().includes(fk)&&!confirm('This road was fixed permanently (protected from crises). Add a new crisis anyway? The protection will be removed.'))return;
  if(!isSlowType(type)&&criticalRoads().has(fk)&&!confirm('⚠ Critical road: it has no alternative route. Closing it cuts part of the campus off. Add the crisis anyway?'))return;
  unprotectRoad(reps,fk);
  reps.unshift({id:Date.now(),user:adminName(),road,type,note:note||'Added by admin',at:new Date().toLocaleString(),status:'Road closed',admin:true,slow:isSlowType(type),danger:DANGER_RE.test(type)});
  applySeverity(e,type);save();setReps(reps);syncFixed(reps);$('cAddNote').value='';
  refresh23();toast(isSlowType(type)?`${type} added. The road is slow for everyone (distance ×${SLOW_MULT}).`:`${type} added. Road closed for everyone.`);
};

// "Delete" now archives: the record stays in History, the road reopens (unless it is permanently fixed).
deleteCrisis=function(id){
  const reps=getReps(),x=reps.find(q=>q.id===id);if(!x)return;
  const k=rk(x),was=isActive(x);
  if(was)endCrisis(x,'Archived');
  x.archived=true;
  const e=repEdge(x),still=reps.some(q=>q!==x&&q.road&&rk(q)===k&&isActive(q));
  if(e&&was&&!still&&!getFixedRoads().includes(k)){clearSeverity(e);save()}
  setReps(reps);syncFixed(reps);refresh23();
};
saveCrisisEdit=function(id){
  const reps=getReps(),x=reps.find(q=>q.id===id);if(!x)return;
  const t=$('cEditType').value,n=$('cEditNote').value.trim();
  x.type=t;x.danger=DANGER_RE.test(t);x.slow=isSlowType(t);x.note=n||x.note;
  if(isActive(x)){const e=repEdge(x);if(e&&!getFixedRoads().includes(rk(x))){applySeverity(e,t);save()}}
  editingCrisis=null;setReps(reps);updateMap();renderReportsPage();renderAdminReports();
};

let crisisView='current';
renderCrisisLog=function(){
  const box=$('crisisLog');if(!box)return;fillCrisisRoads();
  const all=getReps(),fixed=getFixedRoads(),crit=criticalRoads();
  const list=all.filter(x=>crisisView==='history'?!isActive(x):!x.archived).slice(0,200);
  const act=all.filter(isActive),ended=all.filter(x=>x.endedAt&&x.id);
  const avg=ended.length?fmtDur(ended.reduce((t,x)=>t+(x.endedAt-x.id),0)/ended.length):'—';
  const lvlOf=x=>isDanger(x)?'<span class="lvl danger">Dangerous</span>':slowOf(x)?'<span class="lvl slow">Slow ×'+SLOW_MULT+'</span>':'<span class="lvl">Closed</span>';
  const rows=list.map(x=>{
    const fk=rk(x),isProt=fixed.includes(fk)&&x.status==='Fixed'&&!x.protectionRemoved;
    if(editingCrisis===x.id)return `<tr><td>${esc(repLabel(x))}</td><td><select id="cEditType">${CRISIS_TYPES.map(t=>`<option${t===x.type?' selected':''}>${t}</option>`).join('')}${CRISIS_TYPES.includes(x.type)?'':`<option selected>${esc(x.type)}</option>`}</select></td><td colspan="3"><input id="cEditNote" value="${esc(x.note||'')}" maxlength="80"></td><td>${srcOf(x)}</td><td class="act"><button class="primary" data-cl="save" data-id="${x.id}">Save</button><button class="secondary" data-cl="cancel">Cancel</button></td></tr>`;
    const arch=x.archived?'<span class="fixed-lock">Archived</span>':`<button class="secondary" data-cl="delete" data-id="${x.id}">Archive</button>`;
    const actions=isActive(x)
      ? `<button class="secondary" data-cl="edit" data-id="${x.id}">Edit</button><button class="secondary" data-cl="fixed" data-id="${x.id}">Fix</button><button class="secondary" data-cl="reopen" data-id="${x.id}">Reopen</button>${slowOf(x)?`<button class="secondary" data-cl="close" data-id="${x.id}">Close fully</button>`:''}${arch}`
      : isProt ? `<span class="fixed-lock">✓ Permanently fixed</span><button class="secondary" data-cl="unprotect" data-id="${x.id}">Remove protection</button>${arch}`
      : arch;
    const time=isActive(x)?`Active for ${fmtDur(Date.now()-x.id)}`:(x.endedAt?`Lasted ${fmtDur(x.endedAt-x.id)} · by @${esc(x.endedBy||'admin')}`:'');
    return `<tr><td><b>${esc(repLabel(x))}</b></td><td>${esc(x.type)}<small>${esc(x.note||'No additional note')}</small></td><td>${lvlOf(x)}</td><td>${srcOf(x)} · @${esc(x.user||'guest')}</td><td>${esc(x.at)}</td><td><span class="badge ${esc(x.status)}">${esc(x.status)}</span>${time?`<small>${time}</small>`:''}</td><td class="act">${actions}</td></tr>`;
  }).join('');
  const critNames=[...crit].map(k=>{const e=edges.find(q=>key(q.a,q.b)===k);return e?`${nameOf(e.a)} ↔ ${nameOf(e.b)}`:k});
  box.innerHTML=`<div class="crisis-log">
    <h3>All issues · one control table <small>Automatic walker reports appear here without any manual user submission.</small></h3>
    <div class="crisis-stats"><div><b>${all.length}</b><span>Total issues</span></div><div><b>${act.length}</b><span>Active now</span></div><div><b>${act.filter(isDanger).length}</b><span>Dangerous (active)</span></div><div><b>${all.filter(x=>x.status==='Fixed').length}</b><span>Fixed</span></div><div><b>${avg}</b><span>Avg. time to resolve</span></div></div>
    <div class="view-tabs"><button class="secondary${crisisView==='current'?' on':''}" data-view="current">Current</button><button class="secondary${crisisView==='history'?' on':''}" data-view="history">History</button><button class="secondary" data-clear="1" style="margin-left:auto">Clear all crisis data</button></div>
    ${list.length?`<div class="crisis-scroll holistic"><table><thead><tr><th>Road</th><th>Issue</th><th>Level</th><th>Source</th><th>Reported</th><th>Status</th><th>Admin actions</th></tr></thead><tbody>${rows}</tbody></table></div>`:`<div class="empty">${crisisView==='history'?'No finished crises yet.':'No issues yet. If a crisis happens while a user is walking, it will appear here automatically.'}</div>`}
    <p class="subtext"><b>Fix</b> opens the road for everyone and protects it from new random crises. <b>Reopen</b> opens it without protection. <b>Archive</b> removes it from this list but keeps it in History and reopens the road. Slow roads (crowd, construction) stay passable with distance ×${SLOW_MULT}; all other crises close the road.</p>
    <p class="subtext crit-note">${crit.size?`⚠ <b>Critical roads</b> (no alternative route, closing one cuts the campus): ${critNames.map(esc).join(', ')}. The random simulator never closes them.`:'✓ No critical roads: every road has an alternative route.'}</p>
  </div>`;
};
function bindV23(){
  const box=$('crisisLog');if(box)box.addEventListener('click',ev=>{const b=ev.target.closest('[data-view]');if(!b)return;crisisView=b.dataset.view;renderCrisisLog()});
  migrateOpenCrises();renderCrisisLog();updateMap();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindV23);else bindV23();


/* ========================= V24: silent refresh + clear all crisis data ========================= */
let _quiet=false;
const _say24=say,_notify24=notify,_dialog24=showDialog;
say=function(...a){return _quiet?undefined:_say24(...a)};
notify=function(...a){return _quiet?undefined:_notify24(...a)};
showDialog=function(...a){return _quiet?undefined:_dialog24(...a)};
// Re-plan the current route after an admin change WITHOUT speaking, notifications or pop-ups.
const _unlock24=unlockSpeech;unlockSpeech=function(...a){return _quiet?undefined:_unlock24(...a)};
function quietPlan(){_quiet=true;try{plan()}finally{_quiet=false}}

function clearAllCrisisData(){
  const reps=getReps();
  reps.forEach(x=>{const e=x.road&&repEdge(x);if(e)clearSeverity(e)});   // reopen every road that had a crisis
  edges.forEach(e=>{if(e.mult>1)e.mult=1});
  blocked.clear();setReps([]);setFixedRoads([]);save();
  crisisView='current';refresh23();notify('Crisis data cleared','All crisis records, history and protections were removed. Every road is open again.','success');
}
function bindV24(){
  const box=$('crisisLog');if(!box)return;
  box.addEventListener('click',ev=>{const b=ev.target.closest('[data-clear]');if(!b)return;
    if(confirm('Clear ALL crisis records, history and protections, and reopen every road that had a crisis? This cannot be undone.'))clearAllCrisisData()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindV24);else bindV24();


/* ========================= V25: Admin Crisis Manager upgrade (search, filters, sort, bulk, impact, ETA, notes, CSV) ========================= */
let pendingNote='',_noPrompt=false;
let crisisSel=new Set();
const crisisF={q:'',status:'all',level:'all',source:'all',sort:'new'};
const ETA_MIN=[[/crowd/i,30],[/roadblock|security/i,30],[/accident/i,45],[/fire|fallen|tree|blocked|damaged/i,60],[/gas/i,90],[/flood|pipe/i,120],[/construction/i,180]];
const etaMin=x=>{const t=x.type||'';const m=ETA_MIN.find(p=>p[0].test(t));return m?m[1]:60};
const levelKey=x=>isDanger(x)?'danger':slowOf(x)?'slow':'closed';
const statusKey=x=>isActive(x)?'active':x.archived?'archived':String(x.status||'').toLowerCase();
const durMs=x=>(x.endedAt||Date.now())-x.id;

// every ending (Fix / Reopen / Reject / Archive) can carry a short admin note
endCrisis=function(x,status){x.status=status;x.endedAt=Date.now();x.endedBy=adminName();if(pendingNote)x.resolution=pendingNote};
const _aor25=actOnReport;
actOnReport=function(id,act){
  if(!_noPrompt&&(act==='fixed'||act==='reopen'||act==='reject')){
    const n=prompt('Resolution note (optional). Press OK to skip, Cancel to stop.','');
    if(n===null)return;pendingNote=String(n||'').trim();
  }
  try{_aor25(id,act)}finally{if(!_noPrompt)pendingNote=''}
};

// Impact (Floyd-Warshall): how many of all building-to-building routes get longer because of this crisis.
function impactLine(x){
  try{const im=impactOf(x);if(!im)return '';
  return `<p class="impact-line">Affects <b>${im.affected}</b> of ${im.total} possible routes${im.cut?` · <b>${im.cut}</b> now unreachable`:''}${im.worst?` · worst delay: ${nameOf(im.worst.a)} → ${nameOf(im.worst.b)} (+${Math.round(im.worst.extra)})`:''}. Applies to every account on this device.</p>`}catch(e){return ''}
}
function impactOf(x){
  const e=repEdge(x);if(!e||!isActive(x))return null;
  const k=rk(x),withC=floydWarshall(openEdges());
  const without=floydWarshall(edges.filter(q=>key(q.a,q.b)===k||!q.closed).map(q=>key(q.a,q.b)===k?{...q,w:Number(q.w)}:(q.mult>1?{...q,w:Number(q.w)*q.mult}:q)));
  const ids=withC.ids,n=ids.length;let affected=0,cut=0,worst=null;
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
    const b=without.dist[i][j],a=withC.dist[i][j];
    if(a===Infinity&&b!==Infinity){cut++;affected++}
    else if(a>b+1e-9){affected++;const extra=a-b;if(!worst||extra>worst.extra)worst={extra,a:ids[i],b:ids[j]}}
  }
  return {affected,total:n*(n-1)/2,cut,worst};
}
function impactText(x){
  const im=impactOf(x);if(!im)return '';
  if(!im.affected)return 'Impact: no route gets longer (other roads cover it).';
  return `Impact: ${im.affected} of ${im.total} routes affected`+(im.worst?` · worst +${Math.round(im.worst.extra*10)/10} (${nameOf(im.worst.a)} → ${nameOf(im.worst.b)})`:'')+(im.cut?` · cuts off ${im.cut} route${im.cut>1?'s':''}`:'');
}
function etaText(x){
  if(!isActive(x))return '';
  const due=x.id+etaMin(x)*60000,now=Date.now();
  return now>due?`<span class="overdue">Overdue by ${fmtDur(now-due)}</span>`:`Expected clear in ~${fmtDur(due-now)}`;
}

function visibleCrises(){
  const all=getReps(),q=crisisF.q.trim().toLowerCase();
  let l=all.filter(x=>crisisView==='history'?!isActive(x):(!x.archived||crisisF.status==='archived'));
  if(crisisF.status!=='all')l=l.filter(x=>statusKey(x)===crisisF.status);
  if(crisisF.level!=='all')l=l.filter(x=>levelKey(x)===crisisF.level);
  if(crisisF.source!=='all')l=l.filter(x=>(x.admin?'admin':x.auto?'walker':'user')===crisisF.source);
  if(q)l=l.filter(x=>[repLabel(x),x.type,x.note,x.user,x.status,x.resolution].join(' ').toLowerCase().includes(q));
  const S={new:(a,b)=>b.id-a.id,old:(a,b)=>a.id-b.id,longest:(a,b)=>durMs(b)-durMs(a),danger:(a,b)=>(isDanger(b)-isDanger(a))||(b.id-a.id)}[crisisF.sort]||((a,b)=>b.id-a.id);
  return l.sort(S).slice(0,300);
}
function crisisRowHtml(x,fixed){
  const fk=rk(x),isProt=fixed.includes(fk)&&x.status==='Fixed'&&!x.protectionRemoved;
  const lv=isDanger(x)?'<span class="lvl danger">Dangerous</span>':slowOf(x)?'<span class="lvl slow">Slow ×'+SLOW_MULT+'</span>':'<span class="lvl">Closed</span>';
  if(editingCrisis===x.id)return `<tr><td></td><td>${esc(repLabel(x))}</td><td><select id="cEditType">${CRISIS_TYPES.map(t=>`<option${t===x.type?' selected':''}>${t}</option>`).join('')}${CRISIS_TYPES.includes(x.type)?'':`<option selected>${esc(x.type)}</option>`}</select></td><td colspan="3"><input id="cEditNote" value="${esc(x.note||'')}" maxlength="80"></td><td>${srcOf(x)}</td><td class="act"><button class="primary" data-cl="save" data-id="${x.id}">Save</button><button class="secondary" data-cl="cancel">Cancel</button></td></tr>`;
  const arch=x.archived?'<span class="fixed-lock">Archived</span>':`<button class="secondary" data-cl="delete" data-id="${x.id}">Archive</button>`;
  const actions=isActive(x)
    ?`<button class="secondary" data-cl="edit" data-id="${x.id}">Edit</button><button class="secondary" data-cl="fixed" data-id="${x.id}">Fix</button><button class="secondary" data-cl="reopen" data-id="${x.id}">Reopen</button>${slowOf(x)?`<button class="secondary" data-cl="close" data-id="${x.id}">Close fully</button>`:''}${arch}`
    :isProt?`<span class="fixed-lock">✓ Permanently fixed</span><button class="secondary" data-cl="unprotect" data-id="${x.id}">Remove protection</button>${arch}`:arch;
  const time=isActive(x)?`Active for ${fmtDur(Date.now()-x.id)}`:(x.endedAt?`Lasted ${fmtDur(x.endedAt-x.id)} · by @${esc(x.endedBy||'admin')}`:'');
  const imp=isActive(x)?impactText(x):'';
  return `<tr><td><input type="checkbox" data-sel="${x.id}"${crisisSel.has(x.id)?' checked':''}></td><td><b>${esc(repLabel(x))}</b></td>
  <td>${esc(x.type)}<small>${esc(x.note||'No additional note')}</small>${imp?`<small class="impact">${esc(imp)}</small>`:''}</td>
  <td>${lv}</td><td>${srcOf(x)} · @${esc(x.user||'guest')}</td><td>${esc(x.at)}</td>
  <td><span class="badge ${esc(x.status)}">${esc(x.status)}</span>${x.archived&&x.status!=='Archived'?' <span class="tag">archived</span>':''}${time?`<small>${time}</small>`:''}${etaText(x)?`<small>${etaText(x)}</small>`:''}${x.resolution?`<small class="note">📝 ${esc(x.resolution)}</small>`:''}</td>
  <td class="act">${actions}</td></tr>`;
}
function renderBulk(){
  const b=$('crisisBulk');if(!b)return;const n=crisisSel.size;
  b.hidden=!n;b.innerHTML=n?`<b>${n} selected</b><button class="secondary" data-bulk="fix">Fix selected</button><button class="secondary" data-bulk="reopen">Reopen selected</button><button class="secondary" data-bulk="archive">Archive selected</button><button class="secondary" data-bulk="none">Clear selection</button>`:'';
}
function renderCrisisTable(){
  const box=$('crisisTable');if(!box)return;
  const list=visibleCrises(),fixed=getFixedRoads(),total=getReps().length;
  box.innerHTML=list.length
    ?`<div class="crisis-scroll holistic"><table><thead><tr><th><input type="checkbox" id="cSelAll" title="Select all shown"></th><th>Road</th><th>Issue</th><th>Level</th><th>Source</th><th>Reported</th><th>Status</th><th>Admin actions</th></tr></thead><tbody>${list.map(x=>crisisRowHtml(x,fixed)).join('')}</tbody></table></div><p class="subtext">Showing ${list.length} of ${total} records.</p>`
    :`<div class="empty">${total?'No records match these filters.':(crisisView==='history'?'No finished crises yet.':'No issues yet. If a crisis happens while a user is walking, it will appear here automatically.')}</div>`;
  renderBulk();
}
renderCrisisLog=function(){
  const box=$('crisisLog');if(!box)return;fillCrisisRoads();
  const all=getReps(),crit=criticalRoads(),act=all.filter(isActive),ended=all.filter(x=>x.endedAt&&x.id);
  const avg=ended.length?fmtDur(ended.reduce((t,x)=>t+(x.endedAt-x.id),0)/ended.length):'—';
  const byRoad={},byType={};all.forEach(x=>{if(x.road)byRoad[rk(x)]=(byRoad[rk(x)]||0)+1;byType[x.type]=(byType[x.type]||0)+1});
  const top=o=>Object.entries(o).sort((a,b)=>b[1]-a[1])[0];
  const tr=top(byRoad),tt=top(byType),overdue=act.filter(x=>Date.now()>x.id+etaMin(x)*60000).length;
  const trName=tr?(()=>{const e=edges.find(q=>key(q.a,q.b)===tr[0]);return e?`${nameOf(e.a)} ↔ ${nameOf(e.b)}`:tr[0]})():'';
  const critNames=[...crit].map(k=>{const e=edges.find(q=>key(q.a,q.b)===k);return e?`${nameOf(e.a)} ↔ ${nameOf(e.b)}`:k});
  const sel=(id,opts,val)=>`<select id="${id}">${opts.map(o=>`<option value="${o[0]}"${o[0]===val?' selected':''}>${o[1]}</option>`).join('')}</select>`;
  box.innerHTML=`<div class="crisis-log">
    <h3>All issues · one control table <small>Walker crises appear here automatically; every admin action applies to all users of this browser.</small></h3>
    <div class="crisis-stats"><div><b>${all.length}</b><span>Total issues</span></div><div><b>${act.length}</b><span>Active now${overdue?` · ${overdue} overdue`:''}</span></div><div><b>${act.filter(isDanger).length}</b><span>Dangerous (active)</span></div><div><b>${all.filter(x=>x.status==='Fixed').length}</b><span>Fixed</span></div><div><b>${avg}</b><span>Avg. time to resolve</span></div></div>
    ${all.length?`<p class="subtext insight">📊 Most crisis-prone road: <b>${esc(trName)}</b> (${tr[1]}×) · Most common issue: <b>${esc(tt[0])}</b> (${tt[1]}×)</p>`:''}
    <div class="view-tabs"><button class="secondary${crisisView==='current'?' on':''}" data-view="current">Current</button><button class="secondary${crisisView==='history'?' on':''}" data-view="history">History</button></div>
    <div class="crisis-tools"><input id="cSearch" type="search" placeholder="Search road, issue, user, note…" value="${esc(crisisF.q)}">
      ${sel('cFStatus',[['all','All status'],['active','Active'],['fixed','Fixed'],['reopened','Reopened'],['rejected','Rejected'],['archived','Archived']],crisisF.status)}
      ${sel('cFLevel',[['all','All levels'],['danger','Dangerous'],['closed','Closed'],['slow','Slow']],crisisF.level)}
      ${sel('cFSource',[['all','All sources'],['walker','Walker'],['admin','Admin'],['user','User report']],crisisF.source)}
      ${sel('cFSort',[['new','Newest first'],['old','Oldest first'],['longest','Longest lasting'],['danger','Dangerous first']],crisisF.sort)}
      <button class="secondary" data-export="1">Export CSV</button><button class="secondary" data-clear="1">Clear all crisis data</button></div>
    <div id="crisisBulk" class="crisis-bulk" hidden></div>
    <div id="crisisTable"></div>
    <p class="subtext"><b>Fix</b> opens the road for everyone and protects it from new random crises. <b>Reopen</b> opens it without protection. <b>Archive</b> removes it from Current but keeps it in History and reopens the road. Slow roads (crowd, construction) stay passable with distance ×${SLOW_MULT}; all other crises close the road. Expected clearing time depends on the issue type.</p>
    <p class="subtext crit-note">${crit.size?`⚠ <b>Critical roads</b> (no alternative route, closing one cuts the campus): ${critNames.map(esc).join(', ')}. The random simulator never closes them.`:'✓ No critical roads: every road has an alternative route.'}</p>
  </div>`;
  renderCrisisTable();
};

function exportCrisesCsv(){
  const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
  const rows=[['Road','Issue','Level','Source','User','Reported','Status','Ended by','Duration (min)','Note','Resolution note']];
  getReps().slice().sort((a,b)=>a.id-b.id).forEach(x=>rows.push([repLabel(x),x.type,levelKey(x),srcOf(x),x.user||'',x.at,x.status+(x.archived?' (archived)':''),x.endedBy||'',Math.round(durMs(x)/60000),x.note||'',x.resolution||'']));
  const csv=rows.map(r=>r.map(q).join(',')).join('\r\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='crisis-history.csv';document.body.appendChild(a);a.click();a.remove();
  toast('Crisis history exported as crisis-history.csv');
}
function bulkApply(kind){
  const ids=[...crisisSel];if(!ids.length)return;
  if(kind==='archive'&&!confirm(`Archive ${ids.length} selected issue(s)? Their roads reopen and the records stay in History.`))return;
  let note='';if(kind!=='archive'){const n=prompt('Resolution note for all selected (optional). Cancel to stop.','');if(n===null)return;note=String(n||'').trim()}
  _quiet=true;_noPrompt=true;pendingNote=note;let done=0;
  try{ids.forEach(id=>{const x=getReps().find(q=>q.id===id);if(!x)return;
    if(kind==='archive'){if(!x.archived){deleteCrisis(id);done++}}
    else if(isActive(x)){actOnReport(id,kind==='fix'?'fixed':'reopen');done++}})}
  finally{_quiet=false;_noPrompt=false;pendingNote=''}
  crisisSel.clear();renderCrisisLog();notify('Bulk update',`${done} issue(s) updated.`,'success');
}
function bindV25(){
  const box=$('crisisLog');if(!box)return;
  box.addEventListener('input',ev=>{if(ev.target.id==='cSearch'){crisisF.q=ev.target.value;renderCrisisTable()}});
  box.addEventListener('change',ev=>{const t=ev.target,m={cFStatus:'status',cFLevel:'level',cFSource:'source',cFSort:'sort'};
    if(m[t.id]){crisisF[m[t.id]]=t.value;renderCrisisTable();return}
    if(t.dataset&&t.dataset.sel){t.checked?crisisSel.add(+t.dataset.sel):crisisSel.delete(+t.dataset.sel);renderBulk();return}
    if(t.id==='cSelAll'){visibleCrises().forEach(x=>t.checked?crisisSel.add(x.id):crisisSel.delete(x.id));renderCrisisTable()}});
  box.addEventListener('click',ev=>{
    if(ev.target.closest('[data-export]')){exportCrisesCsv();return}
    const b=ev.target.closest('[data-bulk]');if(!b)return;
    if(b.dataset.bulk==='none'){crisisSel.clear();renderCrisisTable()}else bulkApply(b.dataset.bulk)});
  // tell the admin right away when a walker reports a crisis from another tab
  window.addEventListener('storage',ev=>{if(ev.key!==REP||getSession()?.role!=='admin')return;
    try{const n=JSON.parse(ev.newValue||'[]'),o=JSON.parse(ev.oldValue||'[]');if(n.length>o.length&&n[0]&&isActive(n[0]))notify('New crisis reported',`${n[0].type} on ${repLabel(n[0])}. Check the Crisis Manager.`,'danger')}catch(e){}});
  renderCrisisLog();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindV25);else bindV25();

/* ========================= V26: ADMIN-MANAGED CRISIS CATALOG =========================
   Automatic/random crisis generation is intentionally disabled.
   Admin controls a saved list of predefined/custom crises and can activate or stop them.
*/
const CRISIS_CATALOG_KEY='ccn_crisis_catalog_v2';
const DEFAULT_CRISIS_CATALOG=[
  {id:'fire-library',name:'Library Fire',type:'Fire',road:'E|F',note:'Fire reported near the Central Library. Avoid the affected road.'},
  {id:'flood-main',name:'Main Gate Flooding',type:'Flood',road:'A|B',note:'Water has accumulated on the road near the Main Gate.'},
  {id:'accident-cse',name:'Accident near Law College',type:'Accident',road:'B|C',note:'A road accident is blocking the road near the Law College.'},
  {id:'tree-admin',name:'Fallen Tree near ACET Park',type:'Fallen tree',road:'A|L',note:'A fallen tree is blocking the road near ACET Park.'},
  {id:'gas-science',name:'Gas Leak near Pharmacy Department',type:'Gas leak',road:'D|E',note:'Gas leak reported; the road should be avoided.'},
  {id:'construction-junction',name:'Construction Work',type:'Construction work',road:'C|J',note:'Construction activity is affecting the road near the Parking.'},
  {id:'water-cafeteria',name:'Burst Water Pipe',type:'Burst water pipe',road:'C|G',note:'A burst pipe has caused a road obstruction near the Cafeteria.'},
  {id:'crowd-auditorium',name:'Large Student Crowd',type:'Big crowd of students',road:'J|K',note:'Heavy student crowd is slowing movement on the road.'},
  {id:'road-damage-hostel',name:'Damaged Road near Staff Residency',type:'Road damaged',road:'G|K',note:'Road surface is damaged near the staff residency.'},
  {id:'security-block-dstation',name:'Security Roadblock',type:'Road blocked',road:'A|J',note:'Security activity has temporarily blocked this road.'},
  {id:'emergency-incident',name:'Emergency Incident near Main Ground',type:'Accident',road:'D|G',note:'Emergency response activity is blocking the connecting road.'},
  {id:'medical-crowd',name:'Crowd near Basketball Court',type:'Big crowd of students',road:'H|I',note:'A large crowd is affecting access to the Basketball Court.'}
];

const catalogLoad=()=>{
  try{
    const saved=JSON.parse(localStorage.getItem(CRISIS_CATALOG_KEY));
    if(Array.isArray(saved)&&saved.length){
      // Upgrade older saved catalogs without deleting any custom crises created by the admin.
      const ids=new Set(saved.map(x=>x.id));
      const missing=DEFAULT_CRISIS_CATALOG.filter(x=>!ids.has(x.id));
      if(missing.length){const upgraded=[...saved,...clone(missing)];try{localStorage.setItem(CRISIS_CATALOG_KEY,JSON.stringify(upgraded))}catch(e){};return upgraded}
      return saved;
    }
  }catch(e){}
  const fresh=clone(DEFAULT_CRISIS_CATALOG);
  try{localStorage.setItem(CRISIS_CATALOG_KEY,JSON.stringify(fresh))}catch(e){}
  return fresh;
};
const normRoad=r=>String(r||'').split('|').sort().join('|');
const catalogSave=list=>{list.forEach(c=>{c.road=normRoad(c.road)});try{localStorage.setItem(CRISIS_CATALOG_KEY,JSON.stringify(list))}catch(e){}};
let crisisCatalog=catalogLoad();
catalogSave(crisisCatalog); // fixes roads written as J|G instead of G|J so all 12 crises show up

const catalogRoadLabel=r=>{
  const [a,b]=String(r||'').split('|');
  return a&&b?`${nameOf(a)} ↔ ${nameOf(b)}`:'No road selected';
};
const catalogActiveFor=id=>getReps().find(x=>x.catalogId===id&&isActive(x));
const catalogActiveCount=()=>crisisCatalog.filter(x=>catalogActiveFor(x.id)).length;

function catalogRoadOptions(selected=''){
  return edges.filter(e=>!e.closed||key(e.a,e.b)===selected)
    .map(e=>{const k=key(e.a,e.b);return `<option value="${esc(k)}"${k===selected?' selected':''}>${esc(catalogRoadLabel(k))} · ${e.w} units</option>`}).join('');
}
function renderCrisisCatalog(){
  const sel=$('crisisCatalogSelect'),newRoad=$('newCrisisRoad');
  if(!sel||!newRoad)return;
  const valid=crisisCatalog.filter(c=>edges.some(e=>key(e.a,e.b)===c.road));
  sel.innerHTML=valid.length?valid.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} · ${esc(catalogRoadLabel(c.road))}</option>`).join(''):'<option value="">No saved crises</option>';
  newRoad.innerHTML=catalogRoadOptions(newRoad.value||'')||'<option value="">No roads available</option>';
  renderCatalogPreview();
  const list=$('crisisCatalogList');
  if(list){
    list.innerHTML=valid.length?`<div class="crisis-catalog-grid">${valid.map(c=>{
      const active=catalogActiveFor(c.id);
      return `<div class="crisis-catalog-item">
        <div class="crisis-catalog-main">
          <div class="crisis-catalog-title">${esc(c.name)} <span class="crisis-badge ${active?'active':'ready'}">${active?'Active':'Ready'}</span>${c.custom?'<span class="crisis-badge custom">Custom</span>':''}</div>
          <div class="crisis-catalog-meta">${esc(c.type)} · ${esc(catalogRoadLabel(c.road))}<br>${esc(c.note||'No note')}</div>
        </div>
        <div class="crisis-catalog-actions">
          <button class="${active?'secondary':'primary'}" data-catalog-act="${active?'stop':'activate'}" data-catalog-id="${esc(c.id)}">${active?'Stop':'Activate'}</button>
          <button class="secondary" data-catalog-act="edit" data-catalog-id="${esc(c.id)}">Edit</button>
          <button class="secondary" data-catalog-act="delete" data-catalog-id="${esc(c.id)}">Delete</button>
        </div>
      </div>`;
    }).join('')}</div>`:'<div class="crisis-empty">No saved crises yet. Create one above.</div>';
  }
  $('catalogCount').textContent=valid.length;
  $('catalogActive').textContent=catalogActiveCount();
}
function renderCatalogPreview(){
  const sel=$('crisisCatalogSelect'),box=$('crisisCatalogPreview');
  if(!sel||!box)return;
  const c=crisisCatalog.find(x=>x.id===sel.value);
  if(!c){box.innerHTML='Choose a saved crisis to see its details.';return}
  const active=!!catalogActiveFor(c.id);
  box.innerHTML=`<b>${esc(c.name)}</b> · ${esc(c.type)}<br>${esc(catalogRoadLabel(c.road))} · ${active?'<span class="crisis-badge active">Currently active</span>':'Ready to activate'}<br>${esc(c.note||'No note')}`;
}
function renderActiveCrisisList(){
  const box=$('activeCrisisList');if(!box)return;
  const active=getReps().filter(isActive);
  $('repPageOpen').textContent=active.length;
  if(!active.length){box.innerHTML='<div class="crisis-empty">No crisis is active. The campus is operating normally.</div>';return}
  box.innerHTML=active.map(x=>`<div class="active-crisis-row">
    <div><strong>⚠ ${esc(x.catalogName||x.type)}</strong><small>${esc(x.type)} · ${esc(repLabel(x))}<br>${esc(x.note||'Active crisis')}</small></div>
    <div class="active-crisis-actions"><button class="secondary stop-crisis-btn" data-live-stop="${x.id}">Stop &amp; Reopen road</button><button class="secondary" data-live-fix="${x.id}">Mark as Fixed</button></div>
  </div>`).join('');
}
function renderManagedCrisisPage(){
  renderCrisisCatalog();
  renderActiveCrisisList();
  const p=$('crisisLog');if(p)p.innerHTML='';
}
function activateCatalog(id){
  const c=crisisCatalog.find(x=>x.id===id);if(!c)return;
  const fk=c.road;
  if(catalogActiveFor(id)){toast('This crisis is already active.');return}
  if(getFixedRoads().includes(fk)){toast('This road is permanently fixed. Edit this crisis and choose another road.');return}
  const e=edges.find(q=>key(q.a,q.b)===fk);
  if(!e){toast('The saved road no longer exists. Edit this crisis first.');return}
  const conflict=getReps().find(q=>isActive(q)&&rk(q)===fk);
  if(conflict){toast(`This road already has an active crisis: ${conflict.catalogName||conflict.type}.`);return}
  const rep={id:Date.now(),user:getSession()?.username||'admin',road:fk,type:c.type,note:c.note||'Activated by admin',at:new Date().toLocaleString(),status:'Road closed',admin:true,danger:DANGER_RE.test(c.type),catalogId:c.id,catalogName:c.name,managed:true};
  const reps=getReps();reps.unshift(rep);
  if(isSlowType(c.type)){e.mult=SLOW_MULT;e.closed=false}else{e.closed=true;blocked.add(fk)}
  save();setReps(reps);resetSimulation();renderManagedCrisisPage();renderEditor();updateMap();
  notify('Crisis activated',`${c.name} is now active on ${catalogRoadLabel(fk)}.`,isDanger(rep)?'danger':'info');
  toast(`${c.name} activated.`);
}
function stopManagedCrisis(id,protect=false){
  const reps=getReps(),x=reps.find(q=>q.id===Number(id));
  if(!x){toast('Active crisis not found.');return}
  const fk=rk(x),e=repEdge(x);
  if(!isActive(x)){toast('This crisis is already stopped.');return}
  const others=reps.filter(q=>q!==x&&isActive(q)&&rk(q)===fk);
  x.status=protect?'Fixed':'Reopened';x.endedAt=Date.now();x.endedBy=getSession()?.username||'admin';
  if(e&&!others.length){e.closed=false;e.mult=1;blocked.delete(fk);save()}
  if(protect)setFixedRoads([...new Set([...getFixedRoads(),fk])]);
  setReps(reps);syncFixed(reps);resetSimulation();renderManagedCrisisPage();renderEditor();updateMap();
  notify(protect?'Crisis fixed':'Crisis stopped',`${x.catalogName||x.type} on ${repLabel(x)} is ${protect?'fixed and protected':'no longer active'}.`,'success');
}
function editCatalog(id){
  const i=crisisCatalog.findIndex(x=>x.id===id);if(i<0)return;
  const c=crisisCatalog[i];
  if(catalogActiveFor(id)){toast('Stop the active crisis before editing it.');return}
  const name=prompt('Crisis name:',c.name);if(name===null)return;
  const note=prompt('Short note:',c.note||'');if(note===null)return;
  const road=prompt('Road (use building IDs, e.g. B|C):',c.road);if(road===null)return;
  const normalized=road.split('|').map(s=>s.trim()).sort().join('|');
  if(!edges.some(e=>key(e.a,e.b)===normalized)){toast('Invalid road. Example: B|C.');return}
  c.name=name.trim()||c.name;c.note=note.trim();c.road=normalized;c.custom=true;
  catalogSave(crisisCatalog);renderManagedCrisisPage();toast('Crisis updated.');
}
function deleteCatalog(id){
  const c=crisisCatalog.find(x=>x.id===id);if(!c)return;
  if(catalogActiveFor(id)){toast('Stop the crisis before deleting it.');return}
  if(!confirm(`Remove "${c.name}" from the saved crisis list?`))return;
  crisisCatalog=crisisCatalog.filter(x=>x.id!==id);catalogSave(crisisCatalog);renderManagedCrisisPage();toast('Crisis removed from the list.');
}
function createCatalogCrisis(){
  const name=$('newCrisisName').value.trim(),type=$('newCrisisType').value,road=$('newCrisisRoad').value,note=$('newCrisisNote').value.trim();
  if(!name){toast('Enter a crisis name.');$('newCrisisName').focus();return}
  if(!road){toast('Choose a road.');return}
  const id='custom-'+Date.now();
  crisisCatalog.push({id,name,type,road,note:note||'Custom crisis created by admin.',custom:true});
  catalogSave(crisisCatalog);
  $('newCrisisName').value='';$('newCrisisNote').value='';
  renderManagedCrisisPage();
  $('crisisCatalogSelect').value=id;renderCatalogPreview();
  toast('New crisis added to the list. Activate it whenever needed.');
}

/* Replace the random/automatic crisis path with a deliberate admin-controlled system. */

function bindV26(){
  const page=$('reportsPage');if(!page)return;
  $('backHome3').onclick=()=>showPage('homePage');
  $('crisisCatalogSelect').onchange=renderCatalogPreview;
  $('activateCatalogBtn').onclick=()=>activateCatalog($('crisisCatalogSelect').value);
  $('createCrisisBtn').onclick=createCatalogCrisis;
  $('crisisCatalogList').onclick=ev=>{
    const b=ev.target.closest('[data-catalog-act]');if(!b)return;
    const id=b.dataset.catalogId,act=b.dataset.catalogAct;
    if(act==='activate')activateCatalog(id);
    else if(act==='stop'){const x=catalogActiveFor(id);if(x)stopManagedCrisis(x.id,false)}
    else if(act==='edit')editCatalog(id);
    else if(act==='delete')deleteCatalog(id);
  };
  $('activeCrisisList').onclick=ev=>{
    const b=ev.target.closest('[data-live-stop],[data-live-fix]');if(!b)return;
    if(b.dataset.liveStop)stopManagedCrisis(b.dataset.liveStop,false);
    if(b.dataset.liveFix)stopManagedCrisis(b.dataset.liveFix,true);
  };
  $('clearAllActiveCrises').onclick=()=>{
    const active=getReps().filter(isActive);
    if(!active.length){toast('There are no active crises.');return}
    if(!confirm(`Stop all ${active.length} active crisis(es)?`))return;
    active.forEach(x=>stopManagedCrisis(x.id,false));
  };
  renderManagedCrisisPage();
}
renderCrisisLog=renderManagedCrisisPage;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindV26);else bindV26();


/* ===== V27: controlled crisis UX + live route alerts ===== */
(function(){
  const protectedRoad=k=>getFixedRoads().includes(k);
  window.ccnUnprotectCatalog=function(id){
    const c=crisisCatalog.find(x=>x.id===id); if(!c)return;
    const reps=getReps();
    unprotectRoad(reps,c.road);
    setReps(reps); save();
    renderManagedCrisisPage();
    notify('Protection removed',`${c.name} can now be activated again.`,'info');
    toast('Road protection removed. Crisis can be activated again.');
  };
  renderCrisisCatalog=function(){
    const sel=$('crisisCatalogSelect'),newRoad=$('newCrisisRoad');
    if(!sel||!newRoad)return;
    const valid=crisisCatalog.filter(c=>edges.some(e=>key(e.a,e.b)===c.road));
    sel.innerHTML=valid.length?valid.map(c=>{
      const state=catalogActiveFor(c.id)?'ACTIVE':protectedRoad(c.road)?'PROTECTED':'READY';
      return `<option value="${esc(c.id)}">${esc(c.name)} · ${state}</option>`;
    }).join(''):'<option value="">No saved crises</option>';
    newRoad.innerHTML=catalogRoadOptions(newRoad.value||'')||'<option value="">No roads available</option>';
    renderCatalogPreview();
    const list=$('crisisCatalogList');
    if(list){
      list.innerHTML=valid.length?`<div class="crisis-catalog-grid">${valid.map(c=>{
        const active=catalogActiveFor(c.id),prot=protectedRoad(c.road);
        const state=active?'Active':prot?'Protected':'Ready';
        const mainButton=active
          ?`<button class="secondary" data-catalog-act="stop" data-catalog-id="${esc(c.id)}">Stop &amp; Reopen road</button>`
          :prot
            ?`<button class="secondary" data-catalog-act="unprotect" data-catalog-id="${esc(c.id)}">Unprotect</button>`
            :`<button class="primary" data-catalog-act="activate" data-catalog-id="${esc(c.id)}">Activate</button>`;
        return `<div class="crisis-catalog-item ${active?'is-active':''} ${prot?'is-protected':''}">
          <div class="crisis-catalog-main">
            <div class="crisis-catalog-title">${esc(c.name)} <span class="crisis-badge ${active?'active':prot?'protected':'ready'}">${state}</span>${c.custom?'<span class="crisis-badge custom">Custom</span>':''}</div>
            <div class="crisis-catalog-meta">${esc(c.type)} · ${esc(catalogRoadLabel(c.road))}<br>${esc(c.note||'No note')} ${prot?'<br><strong>✓ Road resolved and protected from accidental reactivation.</strong>':''}</div>
          </div>
          <div class="crisis-catalog-actions">${mainButton}<button class="secondary" data-catalog-act="edit" data-catalog-id="${esc(c.id)}">Edit</button><button class="secondary" data-catalog-act="delete" data-catalog-id="${esc(c.id)}">Delete</button></div>
        </div>`;
      }).join('')}</div>`:'<div class="crisis-empty">No saved crises yet. Create one above.</div>';
    }
    $('catalogCount').textContent=valid.length;
    $('catalogActive').textContent=catalogActiveCount();
  };
  renderActiveCrisisList=function(){
    const box=$('activeCrisisList');if(!box)return;
    const active=getReps().filter(isActive);
    $('repPageOpen').textContent=active.length;
    if(!active.length){box.innerHTML='<div class="crisis-empty">No crisis is active. The campus is operating normally.</div>';return}
    box.innerHTML=active.map(x=>`<div class="active-crisis-row">
      <div class="active-crisis-main"><div><strong>🚨 ${esc(x.catalogName||x.type)}</strong><span class="live-status-pill">LIVE</span></div><small>${esc(x.type)} · ${esc(repLabel(x))}<br>${esc(x.note||'Active crisis')}${x.auto?' (reported automatically while a student was walking)':''}</small>
        ${impactLine(x)}
        <p class="crisis-action-help"><b>Stop &amp; Reopen road:</b> ends the incident and opens the road, so it can be triggered again. <b>Mark as Fixed:</b> the incident is resolved and the road is protected from new crises until you press Unprotect.</p>
      </div>
      <div class="active-crisis-actions"><button class="secondary stop-crisis-btn" data-live-stop="${x.id}">Stop &amp; Reopen road</button><button class="primary" data-live-fix="${x.id}">Mark as Fixed</button></div>
    </div>`).join('');
  };

  function liveRouteCrisis(path,index){
    if(!Array.isArray(path)||index>=path.length-1)return null;
    const k=key(path[index],path[index+1]);
    const c=activeCrisisFor(k);
    return c?{k,c,a:path[index],b:path[index+1]}:null;
  }
  function alertAllActive(){try{renderAlerts()}catch(e){} try{renderCrisisWarn()}catch(e){}}
  function preflightNextLeg(){
    if(!navigationStarted||!routes[selectedRoute])return false;
    const path=routes[selectedRoute].path,hit=liveRouteCrisis(path,journeyIndex);
    if(!hit)return false;
    const {c,a,b}=hit;
    const reason=typeof phraseOf==='function'?phraseOf(c.type):String(c.type||'a crisis').toLowerCase();
    crisisInfo={a,b,reason,old:path.slice(journeyIndex).map(nameOf).join(' → '),oldPath:path.slice(journeyIndex),danger:DANGER_RE.test(c.type||''),fromAdmin:true,live:true};
    const text=slowOf(c)
      ?`Crisis detected ahead. The road from ${nameOf(a)} to ${nameOf(b)} is affected by ${reason}. A safer route is being checked from your current location.`
      :`Crisis detected ahead. The road from ${nameOf(a)} to ${nameOf(b)} is blocked because of ${reason}. A safe route is being calculated from your current location.`;
    notify('🚨 Crisis detected ahead',text,'danger');
    say(`Crisis alert. You are at ${nameOf(current)}. The road to ${nameOf(b)} is affected by ${reason}.`,true);
    showDialog('Crisis detected ahead 🚨',text,'danger',`Affected leg: ${nameOf(a)} → ${nameOf(b)}`);
    setStatus('danger',slowOf(c)?'ROAD AFFECTED':'ROAD BLOCKED');
    if(slowOf(c)){
      // Slow crises remain passable. The walker is warned before entering the road;
      // the route engine already accounts for the higher distance/cost.
      return false;
    }
    setTimeout(()=>rerouteFromCurrent(true),350);
    return true;
  }
  const _startNav27=startNavigation;
  startNavigation=function(){
    alertAllActive();
    const r=routes[selectedRoute];
    if(r&&liveRouteCrisis(r.path,journeyIndex)){
      navigationStarted=true;
      preflightNextLeg();
      return;
    }
    _startNav27();
    alertAllActive();
  };
  const _next27=nextStep;
  nextStep=function(){
    alertAllActive();
    if(preflightNextLeg())return;
    _next27();
    alertAllActive();
  };
  const _plan27=plan;
  plan=function(){
    _plan27();
    alertAllActive();
    const active=getReps().filter(isActive);
    if(active.length){
      const route=routes[selectedRoute];
      const hit=route&&liveRouteCrisis(route.path,0);
      if(hit){
        const t=crisisText(hit.c);
        notify('🚨 Active crisis on selected route',t,'danger');
        showDialog('Active crisis on this route 🚨',t+' The navigator will use a safe route whenever possible.','danger',routeText(route));
      }else{
        notify('Campus crisis update',`${active.length} active crisis${active.length===1?'':'es'} are being managed by the administrator. The selected route is currently clear.`,'info');
      }
    }
  };
  const list=$('crisisCatalogList');
  if(list){
    const old=list.onclick;
    list.onclick=function(ev){
      const b=ev.target.closest('[data-catalog-act]');
      if(b&&b.dataset.catalogAct==='unprotect'){ccnUnprotectCatalog(b.dataset.catalogId);return}
      if(old)old.call(this,ev);
    };
  }
  renderManagedCrisisPage();
  alertAllActive();
})();

/* ===== V28: reliable Light / Dark theme toggle ===== */
(function(){
  const b=$('themeBtn'); if(!b)return;
  const applyTheme=dark=>{
    document.body.classList.toggle('dark',!!dark);
    document.documentElement.style.colorScheme=dark?'dark':'light';
    b.textContent=dark?'☀':'☾';
    b.title=dark?'Switch to Light theme':'Switch to Dark theme';
    try{localStorage.setItem('ccn_theme_v2',dark?'dark':'light');localStorage.setItem('ccn_dark',dark?'true':'false')}catch(e){}
  };
  let saved=null;try{saved=localStorage.getItem('ccn_theme_v2')}catch(e){}
  if(saved==='dark')applyTheme(true); else if(saved==='light')applyTheme(false); else applyTheme(document.body.classList.contains('dark'));
  b.onclick=()=>applyTheme(!document.body.classList.contains('dark'));
})();


/* ===== v30: voice mute, auto-walk, live crisis counter ===== */
let voiceMuted=false;
(function(){
  const _say30=say;
  say=function(...a){return voiceMuted?undefined:_say30(...a)};
  const _rl=renderActiveCrisisList;
  renderActiveCrisisList=function(){_rl();const h=$('homeActive');if(h)h.textContent=getReps().filter(isActive).length};
  function stopAuto(){if(walkTimer){clearInterval(walkTimer);walkTimer=null}const b=$('autoWalkBtn');if(b)b.textContent='Auto-walk'}
  document.addEventListener('DOMContentLoaded',()=>{
    const m=$('muteBtn');
    if(m)m.onclick=()=>{voiceMuted=!voiceMuted;m.textContent=voiceMuted?'🔇':'🔊';m.title=voiceMuted?'Voice off':'Voice on';if(voiceMuted)stopSpeech();toast(voiceMuted?'Voice announcements muted.':'Voice announcements on.')};
    const a=$('autoWalkBtn');
    if(a)a.onclick=()=>{
      if(walkTimer){stopAuto();return}
      if(!navigationStarted){toast('Press Start Walking first, then use Auto-walk.');return}
      a.textContent='Stop auto-walk';
      walkTimer=setInterval(()=>{
        if(!navigationStarted){stopAuto();return}
        const d=$('crisisDialog');if((d&&d.classList.contains('show'))||(walkerPos&&walkerPos.anim))return;
        const n=$('nextBtn');if(n)n.click();
      },3200);
    };
    renderActiveCrisisList();
  });
  window.addEventListener('storage',()=>{try{renderActiveCrisisList()}catch(e){}});
})();


/* ===== v31: no protect/unprotect, crisis notice only on the route, smarter crisis cards ===== */
(function(){
  // 1. Protection removed: a resolved crisis can simply be activated again.
  getFixedRoads=function(){return[]};
  setFixedRoads=function(){};
  try{localStorage.removeItem('ccn_fixed_roads_v2')}catch(e){}
  getReps().forEach(x=>{if(x.status==='Fixed')x.status='Resolved'});

  // 2. The map no longer shows a permanent list of campus alerts.
  //    The walker is warned only when a crisis is on THEIR route (Find Routes / while walking).
  renderAlerts=function(){const b=$('alertBar');if(b){b.hidden=true;b.innerHTML=''}};

  // 3. One resolve action per active crisis.
  renderActiveCrisisList=function(){
    const box=$('activeCrisisList');if(!box)return;
    const active=getReps().filter(isActive);
    $('repPageOpen').textContent=active.length;
    if(!active.length){box.innerHTML='<div class="crisis-empty">No crisis is active. The campus is operating normally.</div>';return}
    box.innerHTML=active.map(x=>`<div class="active-crisis-row">
      <div><strong>⚠ ${esc(x.catalogName||x.type)}</strong><small>${esc(x.type)} · ${esc(repLabel(x))}<br>${esc(x.note||'Active crisis')}</small>
      <small class="impact-line">${esc(impactLine(x))}</small></div>
      <div class="active-crisis-actions"><button class="primary" data-live-stop="${x.id}">Resolve · reopen road</button></div>
    </div>`).join('');
  };
  const _stop=stopManagedCrisis;
  stopManagedCrisis=function(id){_stop(id,false)};

  // 4. Crisis cards: show what the crisis does and whether the road is critical (DFS bridge check).
  const _rcc=renderCrisisCatalog;
  renderCrisisCatalog=function(){
    _rcc();
    const list=$('crisisCatalogList');if(!list)return;
    let crit;try{crit=criticalRoads()}catch(e){crit=new Set()}
    list.querySelectorAll('.crisis-catalog-item').forEach(card=>{
      const btn=card.querySelector('[data-catalog-id]');if(!btn)return;
      const c=crisisCatalog.find(q=>q.id===btn.dataset.catalogId);if(!c||card.querySelector('.crisis-chips'))return;
      const slow=slowOf(c);
      const chips=[`<span class="chip ${slow?'chip-slow':'chip-block'}">${slow?'🐢 Slows road ×'+SLOW_MULT:'⛔ Closes road'}</span>`];
      if(crit.has(c.road))chips.push('<span class="chip chip-crit">⚡ Critical road</span>');
      const row=document.createElement('div');row.className='crisis-chips';row.innerHTML=chips.join('');
      card.querySelector('.crisis-catalog-main').appendChild(row);
    });
  };

  // 5. Route cards: clear route or route over a slow road.
  const _rr=renderRoutes;
  renderRoutes=function(){
    _rr();
    document.querySelectorAll('#routesList [data-route]').forEach(b=>{
      const r=routes[+b.dataset.route];if(!r||b.querySelector('.route-tag'))return;
      let slow=0;for(let i=0;i<r.path.length-1;i++){const e=edges.find(q=>key(q.a,q.b)===key(r.path[i],r.path[i+1]));if(e&&e.mult>1)slow++}
      const t=document.createElement('em');t.className='route-tag '+(slow?'tag-slow':'tag-ok');
      t.textContent=slow?`🐢 ${slow} slow road${slow>1?'s':''} on this path`:'✅ Clear route';
      b.querySelector('div').appendChild(t);
    });
  };
  document.addEventListener('DOMContentLoaded',()=>{try{renderManagedCrisisPage();renderRoutes()}catch(e){}});
})();


/* ===== v32: swap route, crisis activity log + stats, CSV export ===== */
(function(){
  const LOG_KEY='ccn_activity_v1';
  const load=()=>{try{const a=JSON.parse(localStorage.getItem(LOG_KEY));return Array.isArray(a)?a:[]}catch(e){return[]}};
  const store=a=>{try{localStorage.setItem(LOG_KEY,JSON.stringify(a.slice(-200)))}catch(e){}};
  const activeIds=()=>new Set(getReps().filter(isActive).map(x=>String(x.id)));

  const _act=activateCatalog;
  activateCatalog=function(id){
    const before=activeIds();
    _act(id);
    renderActivity();
  };
  const _stop2=stopManagedCrisis;
  stopManagedCrisis=function(id){
    const log=load(),e=log.find(q=>String(q.rid)===String(id)&&!q.end);
    _stop2(id);
    if(e&&!activeIds().has(String(id))){e.end=Date.now();e.endBy=adminName();store(log)}
    renderActivity();
  };

  // Keep the log equal to the real crisis state, however a crisis was started or ended
  // (Resolve button, Stop All, Delete, Edit, or a crisis triggered while a student walked).
  function syncLog(){
    const log=load(),act=getReps().filter(isActive),ids=new Set(act.map(x=>String(x.id)));let ch=false;
    log.forEach(q=>{if(!q.end&&!ids.has(String(q.rid))){q.end=Date.now();q.endBy=adminName();ch=true}});
    act.forEach(x=>{if(!log.some(q=>String(q.rid)===String(x.id)&&!q.end)){log.push({rid:String(x.id),name:x.catalogName||x.type,type:x.type,road:repLabel(x),road_key:rk(x),start:Date.parse(x.at)||Date.now(),end:null,by:x.admin?(x.user||'admin'):'walker report'});ch=true}});
    if(ch)store(log);
  }
  const fmt=t=>new Date(t).toLocaleString([],{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  function renderActivity(){
    const st=$('actStats'),ls=$('actList');if(!st||!ls)return;
    syncLog();
    const log=load(),done=log.filter(q=>q.end),live=log.filter(q=>!q.end&&activeIds().has(q.rid));
    const avg=done.length?fmtDur(done.reduce((s,q)=>s+(q.end-q.start),0)/done.length):'—';
    const cnt={};log.forEach(q=>cnt[q.road]=(cnt[q.road]||0)+1);
    const top=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0];
    st.innerHTML=`<div><b>${log.length}</b><span>Total activations</span></div><div><b>${live.length}</b><span>Active now</span></div><div><b>${avg}</b><span>Average time to resolve</span></div><div><b>${top?top[1]+'×':'—'}</b><span>${top?esc(top[0]):'Most affected road'}</span></div>`;
    ls.innerHTML=log.length?log.slice().reverse().slice(0,12).map(q=>`<div class="act-row"><div><b>${esc(q.name)}</b> · ${esc(q.road)}<small>Started ${fmt(q.start)} by ${esc(q.by||'admin')}${q.end?` · resolved ${fmt(q.end)} (${fmtDur(q.end-q.start)})`:''}</small></div><span class="pill ${q.end?'done':'live'}">${q.end?'RESOLVED':'ACTIVE'}</span></div>`).join(''):'<div class="crisis-empty">No activity yet. Activate a crisis to start the log.</div>';
  }
  const _rmp=renderManagedCrisisPage;
  renderManagedCrisisPage=function(){_rmp();renderActivity()};
  renderCrisisLog=renderManagedCrisisPage;

  document.addEventListener('DOMContentLoaded',()=>{
    const sw=$('swapBtn');
    const doSwap=()=>{const s=$('startSelect'),g=$('goalSelect');if(!s||!g)return;const t=s.value;s.value=g.value;g.value=t;s.dispatchEvent(new Event('change'));g.dispatchEvent(new Event('change'));toast('Start and destination swapped. Press Find Routes.')};
    if(sw){sw.onclick=doSwap;sw.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();doSwap()}}}
    const c=$('actClear');if(c)c.onclick=()=>{if(confirm('Clear the crisis activity log?')){store([]);renderActivity()}};
    const x=$('actCsv');if(x)x.onclick=()=>{
      const rows=[['Crisis','Type','Road','Started','Resolved','Duration','By']].concat(load().map(q=>[q.name,q.type,q.road,new Date(q.start).toISOString(),q.end?new Date(q.end).toISOString():'',q.end?fmtDur(q.end-q.start):'active',q.by||'admin']));
      const csv=rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
      const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='crisis-activity-log.csv';a.click();
    };
    renderActivity();
  });
  window.addEventListener('storage',()=>{try{renderActivity()}catch(e){}});
})();


/* ===== v33: nearest emergency exit, saved routes, auto-resolve timer ===== */
(function(){
  const FAV_KEY='ccn_fav_routes_v1',AUTO_KEY='ccn_autoresolve_min';
  const favs=()=>{try{const a=JSON.parse(localStorage.getItem(FAV_KEY));return Array.isArray(a)?a:[]}catch(e){return[]}};
  const saveFavs=a=>{try{localStorage.setItem(FAV_KEY,JSON.stringify(a.slice(0,6)))}catch(e){}};

  function renderFavs(){
    const box=$('favRoutes');if(!box)return;
    const f=favs().filter(q=>nodes.some(n=>n.id===q.s)&&nodes.some(n=>n.id===q.g));
    box.innerHTML=f.map((q,i)=>`<button type="button" class="fav-chip" data-fav="${i}">⭐ ${esc(nameOf(q.s))} → ${esc(nameOf(q.g))}<i data-del="${i}" title="Remove">×</i></button>`).join('');
    box.querySelectorAll('.fav-chip').forEach(b=>b.onclick=e=>{
      const i=+(e.target.dataset.del??-1);
      if(i>=0){const a=favs();a.splice(i,1);saveFavs(a);renderFavs();return}
      const q=f[+b.dataset.fav];$('startSelect').value=q.s;$('goalSelect').value=q.g;$('findRoutes').click();
    });
  }
  function nearestExit(){
    const s=$('startSelect').value;if(!s){toast('Choose your start building first.');return}
    const exits=nodes.filter(n=>/exit|assembly|safe/i.test(n.name)&&n.id!==s);
    if(!exits.length){toast('No emergency exit is set up on this campus.');return}
    let best=null;
    exits.forEach(x=>{const r=floydShortestPath(s,x.id,openEdges());if(r&&r.path&&r.path.length&&Number.isFinite(r.cost)&&(!best||r.cost<best.cost))best={id:x.id,cost:r.cost,path:r.path}});
    if(!best){toast('No open road leads to an emergency exit right now.');return}
    $('goalSelect').value=best.id;$('findRoutes').click();
    notify('Nearest emergency exit',`${nameOf(best.id)} is the closest safe exit (cost ${best.cost}).`,'success');
  }
  // crises older than N minutes are resolved automatically (admin chooses N; 0 = off)
  function autoResolve(){
    const m=+(localStorage.getItem(AUTO_KEY)||0);if(!m)return;
    getReps().filter(isActive).forEach(x=>{const t=Date.parse(x.at);if(t&&Date.now()-t>=m*60000)stopManagedCrisis(x.id)});
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const fr=$('findRoutes');
    if(fr&&!$('quickRow')){
      const row=document.createElement('div');row.id='quickRow';row.className='quick-row';
      row.innerHTML='<button type="button" id="exitBtn" class="secondary">🚨 Nearest emergency exit</button><button type="button" id="favBtn" class="secondary">⭐ Save this route</button><div id="favRoutes" class="fav-routes"></div>';
      $('routeSummary').insertAdjacentElement('beforebegin',row);
      $('exitBtn').onclick=nearestExit;
      $('favBtn').onclick=()=>{const s=$('startSelect').value,g=$('goalSelect').value;if(!s||!g||s===g){toast('Choose a start and a different destination first.');return}
        const a=favs().filter(q=>!(q.s===s&&q.g===g));a.unshift({s,g});saveFavs(a);renderFavs();toast('Route saved.')};
      renderFavs();
    }
    const sel=$('autoResolveSel');
    if(sel){sel.value=localStorage.getItem(AUTO_KEY)||'0';sel.onchange=()=>{try{localStorage.setItem(AUTO_KEY,sel.value)}catch(e){}toast(sel.value==='0'?'Auto-resolve is off.':`Crises will resolve automatically after ${sel.value} min.`)}}
    setInterval(autoResolve,5000);
  });
})();


/* ===== v34: Hidden-crisis mode. Crises stay active (roads really closed/slowed) but are NOT drawn on the map
   and NOT announced when planning. The walker finds out only while walking, then the route is changed. ===== */
(function(){
  const KEY='ccn_hide_crisis';
  const hidden=()=>{try{return localStorage.getItem(KEY)==='1'}catch(e){return false}};
  const revealed=new Set(),slowSeen=new Set();
  const HIDE_RE=/Active crisis on|Campus crisis update|Crisis near you/;

  // run fn while every not-yet-revealed road looks normal (open, normal weight), then restore the real state
  function looksNormal(fn){
    if(!hidden())return fn();
    const snap=edges.map(e=>[e,e.closed,e.mult]),bl=[...blocked];
    edges.forEach(e=>{if(!revealed.has(key(e.a,e.b))){e.closed=false;e.mult=1}});
    bl.forEach(k=>{if(!revealed.has(k))blocked.delete(k)});
    try{return fn()}finally{snap.forEach(([e,c,m])=>{e.closed=c;e.mult=m});bl.forEach(k=>blocked.add(k))}
  }

  const _um=updateMap;      updateMap=function(){return looksNormal(()=>_um())};
  const _rr=renderRoutes;   renderRoutes=function(){return looksNormal(()=>_rr())};

  // planning is "blind": the student is planned along the old road, exactly like in real life
  let suppress=false;
  const _plan=plan;
  plan=function(){
    revealed.clear();slowSeen.clear();
    if(!hidden())return _plan();
    suppress=true;
    try{looksNormal(()=>_plan())}finally{suppress=false}
    try{updateMap()}catch(e){}
  };
  const _reset=resetSimulation;resetSimulation=function(){revealed.clear();slowSeen.clear();return _reset.apply(this,arguments)};

  const _cow=crisisOnWay;crisisOnWay=function(){return hidden()?null:_cow.apply(this,arguments)};
  const _n=notify;notify=function(t,...r){if(hidden()&&(suppress||HIDE_RE.test(String(t)))&&HIDE_RE.test(String(t)))return;return _n(t,...r)};
  const _d=showDialog;showDialog=function(t,...r){if(hidden()&&HIDE_RE.test(String(t)))return;return _d(t,...r)};

  // once the walker has been warned about a road, that road becomes visible on the map
  const _rfc=rerouteFromCurrent;
  rerouteFromCurrent=function(fromCrisis){
    if(fromCrisis&&crisisInfo&&crisisInfo.a&&crisisInfo.b)revealed.add(key(crisisInfo.a,crisisInfo.b));
    return _rfc.apply(this,arguments);
  };

  // slow-road crises (crowd / construction): warn the walker and look for a faster route
  const _next=nextStep;
  nextStep=function(){
    if(hidden()&&navigationStarted&&routes[selectedRoute]){
      const path=routes[selectedRoute].path;
      if(journeyIndex<path.length-1){
        const a=path[journeyIndex],b=path[journeyIndex+1],k=key(a,b),c=activeCrisisFor(k),e=edges.find(q=>key(q.a,q.b)===k);
        if(c&&e&&!e.closed&&e.mult>1&&!slowSeen.has(k)){
          slowSeen.add(k);
          const reason=typeof phraseOf==='function'?phraseOf(c.type):String(c.type||'a crisis').toLowerCase();
          crisisInfo={a,b,reason,old:path.slice(journeyIndex).map(nameOf).join(' → '),oldPath:path.slice(journeyIndex),danger:false,fromAdmin:true,live:true};
          const t=`Crisis detected ahead. The road from ${nameOf(a)} to ${nameOf(b)} is slowed by ${reason} (distance ×${SLOW_MULT}). A faster route is being checked from your current location.`;
          _n('🚨 Crisis detected ahead',t,'danger');
          say(`Crisis alert. You are at ${nameOf(current)}. The road to ${nameOf(b)} is slowed by ${reason}.`,true);
          _d('Crisis detected ahead 🚨',t,'danger',`Affected leg: ${nameOf(a)} → ${nameOf(b)}`);
          setStatus('danger','ROAD AFFECTED');
          setTimeout(()=>rerouteFromCurrent(true),350);
          return;
        }
      }
    }
    return _next.apply(this,arguments);
  };

  // admin switch
  document.addEventListener('DOMContentLoaded',()=>{
    // make the buttons use the newest versions of these functions
    try{$('findRoutes').onclick=plan;$('startNavBtn').onclick=startNavigation;$('nextBtn').onclick=nextStep}catch(e){}
    const t=$('hideCrisisToggle');if(!t)return;
    t.checked=hidden();
    t.onchange=()=>{
      try{localStorage.setItem(KEY,t.checked?'1':'0')}catch(e){}
      revealed.clear();slowSeen.clear();
      try{updateMap();renderRoutes()}catch(e){}
      toast(t.checked?'Hidden mode ON: crises are not drawn on the map. Students are warned only while walking.':'Hidden mode OFF: active crises are drawn on the map.');
    };
  });
})();
