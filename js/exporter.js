/* ========================================
   Visual Novel Creator - Exporter Module
   Exports project as a standalone HTML file
   ======================================== */

const Exporter = {
  exportAsHTML(project) {
    const data = JSON.stringify(project.toJSON());
    const title = project.title || 'Visual Novel';
    const author = project.author || '';

    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${this.escapeHtml(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&family=M+PLUS+Rounded+1c:wght@400;700&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
:root{
--accent:#6c5ce7;--accent2:#a29bfe;--accent-glow:rgba(108,92,231,0.3);
--font-main:'Noto Sans JP',sans-serif;--font-display:'M PLUS Rounded 1c',sans-serif;
}
html,body{height:100%;overflow:hidden;font-family:var(--font-main);background:#000;color:#eee;-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:#444;border-radius:3px}
.hidden{display:none!important}

/* Title Screen */
#title-screen{position:fixed;inset:0;background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);
display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:100;cursor:pointer}
#title-screen h1{font-family:var(--font-display);font-size:48px;color:#fff;margin-bottom:8px;
text-shadow:0 0 30px var(--accent-glow);letter-spacing:4px}
#title-screen .author{font-size:16px;color:rgba(255,255,255,0.5);margin-bottom:60px}
#title-screen .start-btn{padding:14px 48px;border:2px solid var(--accent2);border-radius:30px;
background:transparent;color:var(--accent2);font-size:18px;font-family:var(--font-display);
cursor:pointer;transition:all 0.3s ease;letter-spacing:2px}
#title-screen .start-btn:hover{background:var(--accent);border-color:var(--accent);color:#fff;
box-shadow:0 0 30px var(--accent-glow)}

/* Game Container */
#game{position:fixed;inset:0;overflow:hidden}
#game-bg{position:absolute;inset:0;background-size:cover;background-position:center;
background-color:#1a1a2e;transition:opacity 0.6s ease}
#game-bg.fade-in{animation:fadeIn 0.6s ease}

#game-chars{position:absolute;inset:0;bottom:200px}
.g-char{position:absolute;bottom:0;width:35%;height:85%;display:flex;align-items:flex-end;
justify-content:center;transition:opacity 0.4s ease,transform 0.4s ease}
.g-char[data-pos="left"]{left:2%}
.g-char[data-pos="center"]{left:50%;transform:translateX(-50%)}
.g-char[data-pos="right"]{right:2%}
.g-char img{max-width:100%;max-height:100%;object-fit:contain;filter:drop-shadow(0 4px 20px rgba(0,0,0,0.5))}
.g-char.speaking img{filter:drop-shadow(0 4px 20px rgba(0,0,0,0.5)) brightness(1.05)}
.g-char.dimmed img{filter:drop-shadow(0 4px 20px rgba(0,0,0,0.5)) brightness(0.6)}

#effect-overlay{position:absolute;inset:0;pointer-events:none;z-index:5}
#effect-overlay.fade-white{animation:fadeWhite 1s ease}
#effect-overlay.fade-black{animation:fadeBlack 1s ease}
#effect-overlay.shake{animation:shake 0.5s ease}

@keyframes fadeWhite{0%{background:transparent}50%{background:#fff}100%{background:transparent}}
@keyframes fadeBlack{0%{background:transparent}50%{background:#000}100%{background:transparent}}
@keyframes shake{0%,100%{transform:translateX(0)}10%{transform:translateX(-10px)}30%{transform:translateX(10px)}
50%{transform:translateX(-6px)}70%{transform:translateX(6px)}90%{transform:translateX(-2px)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(5px)}}

#choices{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;
flex-direction:column;gap:12px;z-index:15;min-width:400px}
.choice-btn{padding:16px 32px;border:2px solid rgba(255,255,255,0.3);border-radius:8px;
background:rgba(0,0,30,0.85);color:#fff;font-size:16px;font-family:var(--font-main);
cursor:pointer;transition:all 0.25s ease;text-align:center;backdrop-filter:blur(8px)}
.choice-btn:hover{background:rgba(108,92,231,0.7);border-color:var(--accent2);transform:scale(1.02)}

#textbox{position:absolute;bottom:0;left:0;right:0;height:200px;
background:linear-gradient(to bottom,rgba(0,0,20,0) 0%,rgba(0,0,20,0.85) 15%,rgba(0,0,20,0.95) 100%);
padding:40px 60px 30px;cursor:pointer;z-index:10;display:flex;flex-direction:column}
#name-plate{margin-bottom:8px}
#char-name{font-family:var(--font-display);font-size:20px;font-weight:700;
color:var(--accent2);text-shadow:0 0 10px var(--accent-glow);letter-spacing:1px}
#dialogue{font-size:18px;color:#eee;line-height:1.8;text-shadow:0 1px 3px rgba(0,0,0,0.5);flex:1;overflow:hidden}
#click-ind{position:absolute;bottom:14px;right:60px;color:var(--accent2);font-size:14px;
animation:bounce 1s ease infinite;opacity:0;transition:opacity 0.3s ease}
#click-ind.visible{opacity:1}

#controls{position:absolute;top:10px;right:10px;display:flex;gap:6px;z-index:20;
opacity:0;transition:opacity 0.3s ease}
#game:hover #controls{opacity:1}
.ctrl-btn{padding:6px 14px;border:1px solid rgba(255,255,255,0.2);border-radius:4px;
background:rgba(0,0,0,0.6);color:rgba(255,255,255,0.8);font-size:12px;font-family:var(--font-main);
cursor:pointer;transition:all 0.15s ease;backdrop-filter:blur(4px)}
.ctrl-btn:hover{background:rgba(255,255,255,0.15);color:#fff}
.ctrl-btn.active{background:var(--accent);border-color:var(--accent);color:#fff}

/* Log */
#log-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:50;
display:flex;align-items:center;justify-content:center}
#log-box{width:600px;max-height:80vh;background:#1a1d27;border-radius:12px;overflow:hidden;display:flex;flex-direction:column}
.log-hdr{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #2d3245}
.log-hdr h3{font-size:16px}
.log-close{background:none;border:none;color:#999;font-size:20px;cursor:pointer}
#log-list{flex:1;overflow-y:auto;padding:16px 20px}
.log-e{margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #2d3245}
.log-e:last-child{border-bottom:none}
.log-n{font-size:13px;font-weight:700;margin-bottom:4px}
.log-t{font-size:14px;color:#9ca3b8;line-height:1.6}

/* Save/Load */
#sl-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:50;
display:flex;align-items:center;justify-content:center}
#sl-box{width:500px;background:#1a1d27;border-radius:12px;overflow:hidden}
.sl-hdr{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #2d3245}
#sl-slots{padding:16px;display:flex;flex-direction:column;gap:8px}
.sl-slot{padding:12px 16px;border:1px solid #2d3245;border-radius:8px;background:#242836;
cursor:pointer;transition:all 0.15s ease}
.sl-slot:hover{border-color:var(--accent);background:#2d3245}
.sl-slot-t{font-size:14px;font-weight:600;margin-bottom:4px}
.sl-slot-i{font-size:12px;color:#6b7394}
</style>
</head>
<body>

<!-- Title Screen -->
<div id="title-screen">
<h1>${this.escapeHtml(title)}</h1>
${author ? `<div class="author">by ${this.escapeHtml(author)}</div>` : '<div class="author">&nbsp;</div>'}
<button class="start-btn" onclick="startGame()">START</button>
</div>

<!-- Game -->
<div id="game" class="hidden">
<div id="game-bg"></div>
<div id="game-chars">
<div class="g-char" data-pos="left"></div>
<div class="g-char" data-pos="center"></div>
<div class="g-char" data-pos="right"></div>
</div>
<div id="effect-overlay"></div>
<div id="choices" class="hidden"></div>
<div id="textbox">
<div id="name-plate"><span id="char-name"></span></div>
<div id="dialogue"></div>
<div id="click-ind">&#9660;</div>
</div>
<div id="controls">
<button class="ctrl-btn" id="btn-auto" onclick="toggleAuto()">Auto</button>
<button class="ctrl-btn" id="btn-skip" onclick="toggleSkip()">Skip</button>
<button class="ctrl-btn" onclick="showLog()">Log</button>
<button class="ctrl-btn" onclick="showSL('save')">Save</button>
<button class="ctrl-btn" onclick="showSL('load')">Load</button>
</div>
</div>

<!-- Log -->
<div id="log-overlay" class="hidden">
<div id="log-box">
<div class="log-hdr"><h3>Text Log</h3><button class="log-close" onclick="hideLog()">&times;</button></div>
<div id="log-list"></div>
</div>
</div>

<!-- Save/Load -->
<div id="sl-overlay" class="hidden">
<div id="sl-box">
<div class="sl-hdr"><h3 id="sl-title">Save</h3><button class="log-close" onclick="hideSL()">&times;</button></div>
<div id="sl-slots"></div>
</div>
</div>

<script>
const PROJECT=${data};
let sceneIdx=0,cmdIdx=0,typing=false,autoMode=false,skipMode=false;
let twTimer=null,autoTimer=null,pendingText='',visChars={},curBg=null,textLog=[];
let saveSlots={};
try{saveSlots=JSON.parse(localStorage.getItem('vn_saves_'+btoa(PROJECT.title).slice(0,10))||'{}');}catch(e){}

const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);
function esc(t){const d=document.createElement('div');d.textContent=t;return d.innerHTML}

function startGame(){
$('#title-screen').classList.add('hidden');
$('#game').classList.remove('hidden');
$('#dialogue').style.fontSize=(PROJECT.settings.fontSize||18)+'px';
document.addEventListener('keydown',e=>{
if(e.key===' '||e.key==='Enter')advance();
});
$('#textbox').addEventListener('click',advance);
execCmd();
}

function scene(){return PROJECT.scenes[sceneIdx]||null}
function cmd(){const s=scene();return s?s.commands[cmdIdx]||null:null}
function findChar(id){return PROJECT.characters.find(c=>c.id===id)||null}

function execCmd(){
const c=cmd();
if(!c){sceneEnd();return}
switch(c.type){
case'dialogue':execDialogue(c);break;
case'narration':execNarration(c);break;
case'show':execShow(c);next();break;
case'hide':execHide(c);next();break;
case'bg':execBg(c);next();break;
case'choice':execChoice(c);break;
case'jump':execJump(c);break;
case'effect':execEffect(c);break;
default:next();
}}

function next(){cmdIdx++;execCmd()}
function advance(){
if(typing){completeTw();return}
clearTimers();cmdIdx++;execCmd();
}
function sceneEnd(){
if(sceneIdx<PROJECT.scenes.length-1){sceneIdx++;cmdIdx=0;execCmd();}
else{$('#char-name').textContent='';$('#dialogue').textContent='- The End -';$('#click-ind').classList.remove('visible')}
}

function execDialogue(c){
const ch=findChar(c.characterId);
if(ch&&c.position)showChar(c.characterId,c.position,c.expression||'default');
highlightChar(c.characterId);
const n=$('#char-name');n.textContent=ch?ch.name:'';n.style.color=ch?ch.color:'';
startTw(c.text||'');
textLog.push({name:ch?ch.name:'',color:ch?ch.color:'',text:c.text||''});
}

function execNarration(c){
$('#char-name').textContent='';highlightChar(null);
startTw(c.text||'');
textLog.push({name:'',color:'',text:c.text||''});
}

function startTw(text){
clearTimers();typing=true;
const d=$('#dialogue'),ind=$('#click-ind');ind.classList.remove('visible');
const spd=PROJECT.settings.textSpeed||40;let i=0;d.textContent='';
if(skipMode){d.textContent=text;typing=false;ind.classList.add('visible');autoAdv();return}
twTimer=setInterval(()=>{if(i<text.length){d.textContent+=text[i];i++}else{completeTw()}},spd);
pendingText=text;
}

function completeTw(){
clearTimers();typing=false;
if(pendingText){$('#dialogue').textContent=pendingText;pendingText=''}
$('#click-ind').classList.add('visible');
if(autoMode||skipMode)autoAdv();
}

function autoAdv(){
const d=skipMode?200:(PROJECT.settings.autoSpeed||2000);
autoTimer=setTimeout(advance,d);
}

function clearTimers(){if(twTimer){clearInterval(twTimer);twTimer=null}if(autoTimer){clearTimeout(autoTimer);autoTimer=null}}

function showChar(id,pos,expr){
const ch=findChar(id);if(!ch)return;
if(visChars[id]){const s=$('.g-char[data-pos="'+visChars[id].position+'"]');if(s)s.innerHTML=''}
visChars[id]={position:pos,expression:expr};
const s=$('.g-char[data-pos="'+pos+'"]');if(!s)return;
const src=ch.images[expr]||ch.images['default'];
if(src){s.innerHTML='<img src="'+src+'" style="opacity:0">';
requestAnimationFrame(()=>{const img=s.querySelector('img');if(img){img.style.transition='opacity 0.4s ease';img.style.opacity='1'}})}
}

function execShow(c){showChar(c.characterId,c.position,c.expression||'default')}
function execHide(c){
if(visChars[c.characterId]){
const p=visChars[c.characterId].position;
const s=$('.g-char[data-pos="'+p+'"]');
if(s){const img=s.querySelector('img');if(img){img.style.transition='opacity 0.4s ease';img.style.opacity='0';setTimeout(()=>s.innerHTML='',400)}else s.innerHTML=''}
delete visChars[c.characterId];
}}

function highlightChar(sid){
$$('.g-char').forEach(s=>s.classList.remove('speaking','dimmed'));
if(!sid)return;
Object.entries(visChars).forEach(([id,info])=>{
const s=$('.g-char[data-pos="'+info.position+'"]');if(!s)return;
if(id===sid)s.classList.add('speaking');else s.classList.add('dimmed');
})}

function execBg(c){
const b=$('#game-bg');
if(c.background){b.style.backgroundImage='url('+c.background+')';b.classList.add('fade-in');setTimeout(()=>b.classList.remove('fade-in'),600)}
else b.style.backgroundImage='';
curBg=c.background;
}

function execChoice(c){
$('#click-ind').classList.remove('visible');
const ct=$('#choices');ct.innerHTML='';ct.classList.remove('hidden');
c.choices.forEach(ch=>{
const b=document.createElement('button');b.className='choice-btn';b.textContent=ch.text;
b.addEventListener('click',()=>{ct.classList.add('hidden');
if(ch.targetSceneId){const ti=PROJECT.scenes.findIndex(s=>s.id===ch.targetSceneId);
if(ti>=0){sceneIdx=ti;cmdIdx=0;execCmd();return}}
cmdIdx++;execCmd();});ct.appendChild(b)});
textLog.push({name:'',color:'',text:'[ '+c.choices.map(x=>x.text).join(' / ')+' ]'});
}

function execJump(c){
if(c.targetSceneId){const ti=PROJECT.scenes.findIndex(s=>s.id===c.targetSceneId);
if(ti>=0){sceneIdx=ti;cmdIdx=0;execCmd();return}}next();
}

function execEffect(c){
const o=$('#effect-overlay');o.className='';
requestAnimationFrame(()=>{
o.classList.add(c.effectType==='fade-white'?'fade-white':c.effectType==='shake'?'shake':'fade-black');
const d=c.effectType==='shake'?500:1000;
setTimeout(()=>{o.className='';next()},d)});
}

function toggleAuto(){autoMode=!autoMode;skipMode=false;
$('#btn-auto').classList.toggle('active',autoMode);$('#btn-skip').classList.remove('active');
if(autoMode&&!typing)autoAdv()}

function toggleSkip(){skipMode=!skipMode;autoMode=false;
$('#btn-skip').classList.toggle('active',skipMode);$('#btn-auto').classList.remove('active');
if(skipMode){if(typing)completeTw();else autoAdv()}}

function showLog(){
const l=$('#log-list');l.innerHTML='';
textLog.forEach(e=>{const d=document.createElement('div');d.className='log-e';
d.innerHTML=(e.name?'<div class="log-n" style="color:'+e.color+'">'+esc(e.name)+'</div>':'')+
'<div class="log-t">'+esc(e.text)+'</div>';l.appendChild(d)});
$('#log-overlay').classList.remove('hidden');l.scrollTop=l.scrollHeight}
function hideLog(){$('#log-overlay').classList.add('hidden')}

function showSL(mode){
$('#sl-title').textContent=mode==='save'?'Save':'Load';
const c=$('#sl-slots');c.innerHTML='';
for(let i=1;i<=6;i++){const k='s'+i,d=saveSlots[k];
const s=document.createElement('div');s.className='sl-slot';
s.innerHTML='<div class="sl-slot-t">Slot '+i+'</div><div class="sl-slot-i">'+(d?d.date+' - '+d.sn:'Empty')+'</div>';
s.addEventListener('click',()=>{if(mode==='save')saveSlot(k);else loadSlot(k);hideSL()});c.appendChild(s)}
$('#sl-overlay').classList.remove('hidden')}
function hideSL(){$('#sl-overlay').classList.add('hidden')}

function saveSlot(k){
const s=scene();
saveSlots[k]={date:new Date().toLocaleString('ja-JP'),sn:s?s.name:'?',si:sceneIdx,ci:cmdIdx,
vc:JSON.parse(JSON.stringify(visChars)),bg:curBg,log:[...textLog]};
try{localStorage.setItem('vn_saves_'+btoa(PROJECT.title).slice(0,10),JSON.stringify(saveSlots))}catch(e){}}

function loadSlot(k){
const d=saveSlots[k];if(!d){alert('Empty');return}
sceneIdx=d.si;cmdIdx=d.ci;visChars=d.vc||{};curBg=d.bg;textLog=d.log||[];
if(curBg)$('#game-bg').style.backgroundImage='url('+curBg+')';
$$('.g-char').forEach(s=>s.innerHTML='');
Object.entries(visChars).forEach(([id,info])=>showChar(id,info.position,info.expression));
execCmd()}
</script>
</body>
</html>`;

    Utils.downloadFile(html, (title.replace(/[^a-zA-Z0-9_\-\u3000-\u9fff]/g, '_') || 'visual_novel') + '.html', 'text/html');
  },

  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};
