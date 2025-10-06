// --- Game Config ---
const GRID_ROWS = 5;
const GRID_COLS = 9;
const CELL_SIZE = 72;
const GAME_WIDTH = GRID_COLS * CELL_SIZE;
const GAME_HEIGHT = GRID_ROWS * CELL_SIZE;

// --- Soldier Types ---
const SOLDIERS = [
  { name: "Rifleman", cost: 50, hp: 100, atk: 20, speed: 1, cooldown: 80, color: "#4af", desc: "Basic shooter" },
  { name: "Sniper", cost: 100, hp: 70, atk: 60, speed: 2.3, cooldown: 150, color: "#fff", desc: "Long range, high damage" },
  { name: "Machine Gunner", cost: 120, hp: 120, atk: 10, speed: 0.3, cooldown: 120, color: "#fd0", desc: "Rapid fire" },
  { name: "Grenadier", cost: 140, hp: 90, atk: 35, speed: 1.5, cooldown: 130, color: "#fa3", desc: "Splash damage" },
  { name: "Engineer", cost: 90, hp: 80, atk: 0, speed: 0, cooldown: 110, color: "#0af", desc: "Repairs soldiers" },
  { name: "Flame Trooper", cost: 110, hp: 85, atk: 8, speed: 1, cooldown: 100, color: "#f33", desc: "Burns dragons" }
];

// --- Dragon Types (Enemies) ---
const DRAGONS = [
  { name: "Infantry Dragon",   hp: 60,  atk: 10, speed: 0.7, color: "#f44", reward: 15, good: true, coinsPerSec: 1 },
  { name: "Tank Dragon",       hp: 220, atk: 25, speed: 0.35, color: "#888", reward: 35, good: true, coinsPerSec: 5 },
  { name: "Rare Dragon",       hp: 400, atk: 50, speed: 0.22, color: "#3ef", reward: 80, good: true, coinsPerSec: 10 },
  { name: "Corrupted Dragon",  hp: 90,  atk: 20, speed: 0.8, color: "#c0f", reward: 18, good: false, coinsPerSec: 0 }
];

// --- Game State ---
let state = {
  coins: 100,
  wave: 1,
  rebirths: 0,
  rebirthBonus: 0,
  grid: [],
  soldiers: [],
  dragons: [],
  selectedSoldier: 0,
  cooldowns: Array(SOLDIERS.length).fill(0),
  running: true,
  inventory: [],
  coinsPerSec: 0
};

// --- HTML Elements ---
const coinsEl = document.getElementById('coins');
const waveEl = document.getElementById('waveNum');
const rebirthsEl = document.getElementById('rebirths');
const bonusEl = document.getElementById('rebirthBonus');
const coinsPerSecEl = document.getElementById('coinsPerSec');
const infoEl = document.getElementById('info');
const rebirthBtn = document.getElementById('rebirthBtn');
const soldiersBar = document.getElementById('soldiersBar');
const dragonInventory = document.getElementById('dragonInventory');

// --- Canvas ---
const gameArea = document.getElementById('gameArea');
gameArea.innerHTML = `<canvas id="gameCanvas" width="${GAME_WIDTH}" height="${GAME_HEIGHT}"></canvas>`;
const ctx = document.getElementById('gameCanvas').getContext('2d');

// --- Grid Initialization ---
function initGrid() {
  state.grid = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    state.grid[r] = [];
    for (let c = 0; c < GRID_COLS; c++) state.grid[r][c] = null;
  }
}
initGrid();

// --- Soldier Bar ---
function renderSoldiersBar() {
  soldiersBar.innerHTML = '';
  SOLDIERS.forEach((soldier, idx) => {
    const card = document.createElement('div');
    card.className = 'soldier-card' + (state.selectedSoldier===idx ? ' selected':'');
    card.innerHTML = `<strong>${soldier.name}</strong>
      <span style="font-size:13px">${soldier.desc}</span>
      <span>Cost: ${soldier.cost}</span>
      <span>HP: ${soldier.hp}</span>
      <span>ATK: ${soldier.atk}</span>
    `;
    card.onclick = ()=>{state.selectedSoldier=idx;renderSoldiersBar();};
    soldiersBar.appendChild(card);
  });
}
renderSoldiersBar();

// --- Place Soldier ---
gameArea.addEventListener('click', e => {
  if (!state.running) return;
  const rect = gameArea.getBoundingClientRect();
  const x = e.clientX - rect.left, y = e.clientY - rect.top;
  const c = Math.floor(x/CELL_SIZE), r = Math.floor(y/CELL_SIZE);

  // Bounds, only place on empty cell
  if(r<0||r>=GRID_ROWS||c<0||c>=GRID_COLS) return;
  if (state.grid[r][c]) return;

  const s = SOLDIERS[state.selectedSoldier];
  if (state.coins < s.cost || state.cooldowns[state.selectedSoldier]>0) return;

  // Place!
  state.coins -= s.cost;
  state.grid[r][c] = {
    ...s, row: r, col: c, hp: s.hp, cooldown: 0, id:Math.random()
  };
  state.soldiers.push(state.grid[r][c]);
  state.cooldowns[state.selectedSoldier]=s.cooldown;
});

// --- Inventory and Passive Income ---
function updateInventory(dragonType) {
  // 50% chance to capture a dragon when defeated, only if it is "good"
  if (!dragonType.good) return;
  let idx = state.inventory.findIndex(d => d.name === dragonType.name);
  if (idx >= 0) {
    state.inventory[idx].count++;
  } else {
    state.inventory.push({
      name: dragonType.name,
      coinsPerSec: dragonType.coinsPerSec,
      count: 1,
      color: dragonType.color
    });
  }
  updateCoinsPerSec();
  renderInventory();
}

function updateCoinsPerSec() {
  state.coinsPerSec = state.inventory.reduce((sum, d)=>sum+d.coinsPerSec*d.count,0);
  coinsPerSecEl.textContent = state.coinsPerSec;
}

function renderInventory() {
  dragonInventory.innerHTML = "<strong>Dragon Inventory:</strong> ";
  if (state.inventory.length === 0) {
    dragonInventory.innerHTML += "<i>None</i>";
    return;
  }
  state.inventory.forEach(d => {
    const span = document.createElement('span');
    span.className="dragon-item";
    span.style.background = d.color;
    span.textContent = `${d.name} x${d.count} (+${d.coinsPerSec * d.count}/s)`;
    dragonInventory.appendChild(span);
  });
}

// --- Rebirth Button Logic ---
function rebirthRequirementMet() {
  // Needs at least 3 "good" dragons of any type
  let goodDragonCount = state.inventory.reduce((sum, d) => sum + d.count, 0);
  return goodDragonCount >= 3;
}

rebirthBtn.onclick = ()=>{
  if (!rebirthRequirementMet()) {
    infoEl.textContent = "You need at least 3 good dragons in your inventory to rebirth!";
    return;
  }
  state.rebirths += 1;
  state.rebirthBonus = 10*state.rebirths;
  resetGame(true);
  infoEl.textContent = `Rebirth successful! Permanent +${state.rebirthBonus}% coin bonus.`;
};

function checkRebirthButton() {
  rebirthBtn.disabled = !rebirthRequirementMet();
}

// --- Dragon Spawning ---
function spawnWave() {
  let waveLevel = state.wave;
  for (let i=0;i<waveLevel+2;i++) {
    setTimeout(()=>{
      let typeRand = Math.random();
      let dTypeIdx = 0;
      if (typeRand > 0.85) dTypeIdx = 2;
      else if (typeRand > 0.65) dTypeIdx = 1;
      else if (typeRand > 0.5) dTypeIdx = 3;
      let row = Math.floor(Math.random()*GRID_ROWS);
      let dragon = {...DRAGONS[dTypeIdx]};
      dragon.x = GAME_WIDTH-10; dragon.y = row*CELL_SIZE+CELL_SIZE/2;
      dragon.row = row;
      dragon.hp = Math.round(dragon.hp*(1+0.15*(waveLevel-1)));
      dragon.id = Math.random();
      state.dragons.push(dragon);
    }, i*900);
  }
}

// --- Game Reset / Rebirth ---
function resetGame(isRebirth) {
  state.grid = [];
  state.soldiers = [];
  state.dragons = [];
  state.wave = 1;
  state.coins = 100 + Math.floor(100*state.rebirths*0.5);
  state.cooldowns = Array(SOLDIERS.length).fill(0);
  state.running = true;
  if (!isRebirth) { state.inventory = []; }
  initGrid();
  renderSoldiersBar();
  renderInventory();
  updateCoinsPerSec();
  checkRebirthButton();
}

resetGame(false);

// --- Main Loop ---
function gameLoop() {
  coinsEl.textContent = state.coins;
  waveEl.textContent = state.wave;
  rebirthsEl.textContent = state.rebirths;
  bonusEl.textContent = `${state.rebirthBonus}%`;
  coinsPerSecEl.textContent = state.coinsPerSec;
  checkRebirthButton();

  ctx.clearRect(0,0,GAME_WIDTH,GAME_HEIGHT);
  // Draw grid
  for (let r=0;r<GRID_ROWS;r++) {
    for (let c=0;c<GRID_COLS;c++) {
      ctx.strokeStyle = "#333";
      ctx.strokeRect(c*CELL_SIZE, r*CELL_SIZE, CELL_SIZE, CELL_SIZE);
      // Draw soldiers
      let s = state.grid[r][c];
      if (s) {
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(c*CELL_SIZE+CELL_SIZE/2, r*CELL_SIZE+CELL_SIZE/2, 24, 0, 2*Math.PI);
        ctx.fill();
        ctx.fillStyle="#fff";
        ctx.font="bold 15px Arial";
        ctx.fillText(s.name[0], c*CELL_SIZE+CELL_SIZE/2-7, r*CELL_SIZE+CELL_SIZE/2+7);
      }
    }
  }
  // Update cooldowns
  for(let i=0;i<state.cooldowns.length;i++)
    if(state.cooldowns[i]>0) state.cooldowns[i]--;

  // Soldiers attack (simplified, expand for special abilities)
  for(let s of state.soldiers) {
    if(s.hp<=0) continue;
    if(s.atk>0) {
      // Find nearest dragon in same row
      let targets = state.dragons.filter(d=>d.row===s.row&&d.x>(s.col*CELL_SIZE));
      if(targets.length>0) {
        let t = targets.reduce((a,b)=>a.x<b.x?a:b);
        if(!s.fireTick) s.fireTick=0;
        s.fireTick++;
        if(s.fireTick>s.speed*24) {
          t.hp -= s.atk;
          s.fireTick=0;
        }
      }
    }
    // Engineer repairs
    if(s.name==="Engineer") {
      let all = state.soldiers.filter(o=>Math.abs(o.row-s.row)<=1&&Math.abs(o.col-s.col)<=1 && o.hp>0 && o.id!==s.id);
      for(let o of all) {
        o.hp = Math.min(o.hp+0.1, SOLDIERS.find(sl=>sl.name===o.name).hp);
      }
    }
    // Medics heal
    if(s.name==="Medic") {
      let all = state.soldiers.filter(o=>Math.abs(o.row-s.row)<=1&&Math.abs(o.col-s.col)<=1 && o.hp>0 && o.id!==s.id);
      for(let o of all) {
        o.hp = Math.min(o.hp+0.2, SOLDIERS.find(sl=>sl.name==="Medic").hp);
      }
    }
    // Grenadier splash (not implemented for brevity)
    // Flame Trooper burn (not implemented for brevity)
  }

  // Dragons move & attack
  for(let d of state.dragons) {
    if(d.hp<=0) continue;
    d.x -= d.speed*2;
    // Collide with soldier?
    let c = Math.floor((d.x-24)/CELL_SIZE);
    if(c>=0 && c<GRID_COLS) {
      let s = state.grid[d.row][c];
      if(s && s.hp>0) {
        s.hp -= d.atk*0.10;
        d.hp -= s.atk*0.20; // retaliation
        if(s.hp<=0) { state.grid[d.row][c]=null; }
        if(d.hp<=0) { continue; }
        d.x += d.speed*1.3; // slow if fighting
      }
    }
    // Base breach
    if(d.x<0) {
      state.running=false;
      infoEl.textContent="Your base was breached! Game Over.";
      return;
    }
  }

  // Remove dead soldiers and dragons
  state.soldiers = state.soldiers.filter(s=>s.hp>0);
  // Dragons: if killed, 50% chance to add to inventory if "good"
  let killed = state.dragons.filter(d=>d.hp<=0);
  for (let d of killed) if (Math.random()<0.5) updateInventory(DRAGONS.find(dt=>dt.name===d.name));
  state.dragons = state.dragons.filter(d=>d.hp>0);

  // Next wave?
  if(state.running && state.dragons.length===0) {
    setTimeout(()=>{
      state.wave++;
      state.coins += Math.round(state.wave*25*(1+state.rebirthBonus/100));
      spawnWave();
      infoEl.textContent = `Wave ${state.wave}!`;
    }, 900);
  }

  // Draw dragons
  for(let d of state.dragons) {
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.arc(d.x, d.row*CELL_SIZE+CELL_SIZE/2, 22, 0, 2*Math.PI);
    ctx.fill();
    ctx.fillStyle="#fff";
    ctx.font="bold 14px Arial";
    ctx.fillText(d.name[0], d.x-7, d.row*CELL_SIZE+CELL_SIZE/2+7);
  }

  if(state.running)
    requestAnimationFrame(gameLoop);
}

// --- Passive Income Loop ---
setInterval(()=>{
  if (!state.running) return;
  if (state.coinsPerSec > 0) {
    state.coins += Math.round(state.coinsPerSec*(1+state.rebirthBonus/100));
    coinsEl.textContent = state.coins;
  }
}, 1000);

spawnWave();
gameLoop();
