(() => {
  'use strict';
  const SIZE=620, TRACK_COUNT=52, COLORS=['red','green','yellow','blue'];
  const LABELS={red:'Red',green:'Green',yellow:'Yellow',blue:'Blue'};
  const SAFE=new Set([0,8,13,21,26,34,39,47]);
  const TRACK=[], BASE={}, LANES={};
  const $=id=>document.getElementById(id);
  const board=$('gameBoard'), trackLayer=$('trackLayer'), tokenLayer=$('tokenLayer');
  const dice=$('dice'), rollBtn=$('rollBtn'), message=$('messageBox'), cards=$('playerCards');
  const moveHistory=$('moveHistory'), computerMode=$('computerMode'), playerCount=$('playerCount');
  let timeout=null, audioContext=null, soundOn=true, round=1;
  const game={players:[],turn:0,die:null,over:false,history:[]};

  function buildBoard(){
    const bases={red:{x:.17,y:.17},green:{x:.17,y:.83},yellow:{x:.83,y:.17},blue:{x:.83,y:.83}};
    for(const color of COLORS){
      const base=document.createElement('div');base.className=`home-base ${color}`;board.insertBefore(base,trackLayer);
      [[24,24],[50,24],[24,50],[50,50]].forEach(([x,y])=>{const slot=document.createElement('i');slot.className='slot';slot.style.left=`${x}%`;slot.style.top=`${y}%`;base.appendChild(slot)});
      BASE[color]=[[24,24],[50,24],[24,50],[50,50]].map(([x,y])=>({x:SIZE*(bases[color].x+x/100*.44),y:SIZE*(bases[color].y+y/100*.44)}));
    }
    const center=document.createElement('div');center.className='board-center';center.innerHTML='<span>✦</span><small>HOME</small>';board.insertBefore(center,trackLayer);
    const cx=SIZE/2,cy=SIZE/2,r=SIZE*.35;
    for(let i=0;i<TRACK_COUNT;i++){
      const a=-Math.PI/2+i/ TRACK_COUNT*Math.PI*2,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;
      const cell=document.createElement('div');cell.className=`track-cell${SAFE.has(i)?' safe':''}`;
      cell.style.left=`${x/SIZE*100}%`;cell.style.top=`${y/SIZE*100}%`;
      TRACK.push({x,y});trackLayer.appendChild(cell);
    }
    for(const color of COLORS){
      const angle={red:-Math.PI/2,green:Math.PI/2,yellow:Math.PI/2,blue:-Math.PI/2}[color];
      // End each colored home lane at the center, approaching from its own quadrant.
      const laneAngle={red:Math.PI/4,green:-Math.PI/4,yellow:3*Math.PI/4,blue:-3*Math.PI/4}[color];
      LANES[color]=Array.from({length:6},(_,i)=>{const radius=SIZE*(.21-i*.034);return{x:cx+Math.cos(laneAngle)*radius,y:cy+Math.sin(laneAngle)*radius}});
      const start={red:0,green:13,yellow:26,blue:39}[color];
      const a=-Math.PI/2+start/TRACK_COUNT*Math.PI*2, idx=Math.round((a+2*Math.PI)%(2*Math.PI)/(2*Math.PI)*TRACK_COUNT);
      const cell=trackLayer.children[idx];if(cell)cell.classList.add('start',color);
    }
  }
  function playerIsCpu(index){return computerMode.checked&&index!==0}
  function newPlayers(){
    const count=Number(playerCount.value);
    game.players=COLORS.slice(0,count).map((color,index)=>({color,name:LABELS[color],cpu:playerIsCpu(index),tokens:Array.from({length:4},(_,i)=>({id:`${color}-${i}`,color,progress:-1,finished:false,baseSlot:i}))}));
    game.turn=0;game.die=null;game.over=false;game.history=[];round=1;
  }
  function current(){return game.players[game.turn]}
  function startIndex(color){return{red:0,green:13,yellow:26,blue:39}[color]}
  function position(token){
    if(token.progress===-1)return BASE[token.color][token.baseSlot];
    if(token.progress<52)return TRACK[(startIndex(token.color)+token.progress)%52];
    if(token.progress<57)return LANES[token.color][token.progress-52];
    return{x:SIZE/2,y:SIZE/2};
  }
  function paintMessage(text){message.textContent=text}
  function playTone(freq=440,duration=.08,type='sine'){
    if(!soundOn)return;
    try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type=type;osc.frequency.value=freq;gain.gain.setValueAtTime(.055,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);osc.connect(gain);gain.connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+duration)}catch(_){/* Audio is optional. */}
  }
  function addHistory(text,color){game.history.unshift({text,color});game.history=game.history.slice(0,4);renderHistory()}
  function renderHistory(){moveHistory.innerHTML='';if(!game.history.length){moveHistory.innerHTML='<li class="empty-history">Your first move is waiting.</li>';return}for(const item of game.history){const li=document.createElement('li'),dot=document.createElement('i');dot.className='history-dot';dot.style.setProperty('--history-color',`var(--${item.color})`);li.append(dot,document.createTextNode(item.text));moveHistory.appendChild(li)}}
  function renderCards(){
    cards.innerHTML='';$('playerCountLabel').textContent=String(game.players.length).padStart(2,'0');
    for(let i=0;i<game.players.length;i++){
      const p=game.players[i],finished=p.tokens.filter(t=>t.finished).length,active=p.tokens.filter(t=>t.progress>=0&&!t.finished).length;
      const card=document.createElement('div');card.className=`player-card${i===game.turn&&!game.over?' current':''}`;card.style.setProperty('--player-color',`var(--${p.color})`);
      const dot=document.createElement('span');dot.className='player-dot';dot.textContent=p.cpu?'✦':p.name[0];
      const info=document.createElement('div');info.className='player-info';info.innerHTML=`<div class="player-name">${p.name}${p.cpu?' <span style="color:#888;font-size:9px">· CPU</span>':''}${i===game.turn&&!game.over?' <span style="color:#ffc56b;font-size:9px">· TURN</span>':''}</div><div class="player-sub">${active} racing · ${4-finished-active} in yard</div><div class="progress-track"><div class="progress-fill" style="width:${finished*25}%"></div></div>`;
      const score=document.createElement('span');score.className='player-score';score.textContent=`${finished}/4`;
      card.append(dot,info,score);cards.appendChild(card);
    }
  }
  function renderTokens(){
    tokenLayer.innerHTML='';
    for(const p of game.players)for(const token of p.tokens){
      const el=document.createElement('button');el.type='button';el.className=`token ${p.color}`;el.dataset.tokenId=token.id;el.setAttribute('aria-label',`${p.name} token ${token.baseSlot+1}`);el.title=`${p.name} token ${token.baseSlot+1}`;
      const pos=position(token);el.style.left=`${pos.x/SIZE*100}%`;el.style.top=`${pos.y/SIZE*100}%`;
      if(game.die!==null&&p===current()&&valid(token,game.die))el.classList.add('highlighted');
      el.addEventListener('click',()=>selectToken(token));tokenLayer.appendChild(el);
    }
  }
  function updateTurnUI(){
    const p=current();$('turnTitle').textContent=`${p.name}${p.cpu?' (CPU)':''}'s turn`;$('turnBadge').textContent=p.name.toUpperCase();$('turnBadge').className=`turn-badge ${p.color}`;
    $('statusLabel').textContent=p.cpu?'CPU THINKING':'YOUR TABLE';$('rollHint').textContent=game.die!==null?'Choose one of your glowing tokens.':p.cpu?'The computer is making its move.':p.tokens.every(t=>t.progress===-1)?'Need a six to bring a token out.':'Roll to keep your tokens moving.';
    $('roundNumber').textContent=String(round).padStart(2,'0');rollBtn.disabled=game.over||game.die!==null||p.cpu;
    $('rollLabel').textContent=game.die!==null?'Choose a token':'Roll the dice';renderCards();renderTokens();
  }
  function valid(token,value){if(token.finished)return false;if(token.progress===-1)return value===6;return token.progress+value<=57}
  function roll(){
    if(game.die!==null||game.over)return;
    const p=current(),value=Math.floor(Math.random()*6)+1;game.die=value;dice.innerHTML=`<span>${value}</span>`;dice.setAttribute('aria-label',`Dice shows ${value}`);dice.classList.remove('rolling');void dice.offsetWidth;dice.classList.add('rolling');playTone(540,.13,'triangle');
    const moves=p.tokens.filter(t=>valid(t,value));updateTurnUI();
    if(!moves.length){paintMessage(`${p.name} rolled ${value}. No moves this time.`);addHistory(`${p.name} rolled ${value} — no move`,p.color);rollBtn.disabled=true;timeout=setTimeout(()=>{game.die=null;dice.innerHTML='<span>?</span>';advanceTurn();},850);return}
    paintMessage(`${p.name} rolled ${value}! Choose a glowing token.`);
    if(p.cpu)timeout=setTimeout(()=>cpuMove(moves),850);
  }
  function selectToken(token){if(game.die===null||game.over||current().cpu||token.color!==current().color||!valid(token,game.die))return;move(token,game.die)}
  function move(token,steps){
    const p=current(),before=token.progress;let captured=0;
    token.progress=before===-1?0:before+steps;
    if(token.progress===57)token.finished=true;
    if(token.progress>=0&&token.progress<52){
      const target=(startIndex(token.color)+token.progress)%52;
      if(!SAFE.has(target))for(const enemy of game.players){if(enemy===p)continue;for(const foe of enemy.tokens){if(foe.progress>=0&&foe.progress<52&&(startIndex(foe.color)+foe.progress)%52===target){foe.progress=-1;foe.finished=false;captured++}}}
    }
    const home=token.finished,launch=before===-1;game.die=null;dice.innerHTML='<span>?</span>';dice.setAttribute('aria-label','Dice not rolled yet');
    let action=launch?'brought a token out':home?'brought a token home':`moved ${steps} spaces`;
    if(captured)action+=` and captured ${captured}`;
    paintMessage(`${p.name} ${action}${home?'!':'.'}`);addHistory(`${p.name} ${action}`,p.color);playTone(home?790:captured?660:430,.12,home?'sine':'triangle');
    if(home||captured)confetti(home?28:12);
    renderCards();renderTokens();
    if(p.tokens.every(t=>t.finished)){finishGame(p);return}
    if(steps===6||captured){paintMessage(`${p.name} gets another turn${captured?' for the capture':' for rolling a six'}!`);updateTurnUI();if(p.cpu)timeout=setTimeout(cpuRoll,700);return}
    advanceTurn();
  }
  function advanceTurn(){if(timeout){clearTimeout(timeout);timeout=null}game.turn=(game.turn+1)%game.players.length;if(game.turn===0)round++;paintMessage(`${current().name}'s turn. ${current().cpu?'The computer is up next.':'Roll the dice to play.'}`);updateTurnUI();if(current().cpu)timeout=setTimeout(cpuRoll,700)}
  function cpuRoll(){if(game.over||!current().cpu)return;roll()}
  function cpuMove(choices){if(game.over||!current().cpu||game.die===null)return;const best=choices.slice().sort((a,b)=>score(b)-score(a))[0];move(best,game.die)}
  function score(t){if(t.progress===-1)return 100;if(t.progress+game.die===57)return 200;if(t.progress+game.die>=52)return 30+t.progress;return 10+t.progress+Math.random()*5}
  function finishGame(winner){game.over=true;rollBtn.disabled=true;paintMessage(`🏆 ${winner.name} wins the table! Start a new game for another round.`);$('turnTitle').textContent=`${winner.name} wins!`;addHistory(`${winner.name} wins the game!`,winner.color);renderCards();playTone(880,.3,'sine');setTimeout(()=>playTone(1175,.4,'sine'),160);confetti(100)}
  function confetti(amount){const layer=$('confettiLayer');const palette=['#ffc56b','#fa5d72','#4fd5a0','#f6cb59','#61a9ff','#fff'];for(let i=0;i<amount;i++){const bit=document.createElement('i');bit.className='confetti-piece';bit.style.left=`${Math.random()*100}%`;bit.style.background=palette[Math.floor(Math.random()*palette.length)];bit.style.animationDelay=`${Math.random()*.5}s`;bit.style.setProperty('--drift',`${(Math.random()-.5)*220}px`);layer.appendChild(bit);setTimeout(()=>bit.remove(),4200)}}
  function reset(){if(timeout){clearTimeout(timeout);timeout=null}newPlayers();dice.innerHTML='<span>?</span>';dice.setAttribute('aria-label','Dice not rolled yet');$('turnTitle').textContent="Red's turn";$('statusLabel').textContent='YOUR TABLE';$('confettiLayer').innerHTML='';paintMessage("Red's turn. Roll the dice to begin!");renderHistory();updateTurnUI()}
  rollBtn.addEventListener('click',roll);$('newGameBtn').addEventListener('click',reset);playerCount.addEventListener('change',reset);computerMode.addEventListener('change',reset);
  $('rulesBtn').addEventListener('click',()=>$('rulesDialog').showModal());$('soundBtn').addEventListener('click',()=>{soundOn=!soundOn;$('soundBtn').textContent=soundOn?'🔊':'🔇';$('soundBtn').setAttribute('aria-label',soundOn?'Mute sound':'Enable sound');if(soundOn)playTone()});
  $('rulesDialog').addEventListener('click',e=>{if(e.target===$('rulesDialog'))$('rulesDialog').close()});
  buildBoard();reset();
})();
