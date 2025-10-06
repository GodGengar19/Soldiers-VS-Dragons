// --- Game Config ---
const GRID_ROWS = 5;
const GRID_COLS = 9;
const CELL_SIZE = 72;
const GAME_WIDTH = GRID_COLS * CELL_SIZE;
const GAME_HEIGHT = GRID_ROWS * CELL_SIZE;

const SOLDIERS = [
  {
    name: "Rifleman", cost: 50, hp: 100, atk: 20, speed: 1, cooldown: 80, color: "#4af", desc: "Basic shooter"
  },
  {
    name: "Medic", cost: 75, hp: 80, atk: 0, speed: 0, cooldown: 100, color: "#5f4", desc: "Heals nearby soldiers"
  }
];

const ENEMIES = [
  { name: "Infantry", hp: 60, atk: 10, speed: 0.7, color: "#f44", reward: 15 },
  { name: "Tank", hp: 200, atk: 25, speed: 0.35, color: "#888", reward: 35 }
];

// --- Game State ---
let state = {
  coins: 100,
  wave: 1,
  rebirths: 0,
  rebirthBonus: 0,
  grid: [],
  soldiers: [],
  enemies: [],
  selectedSoldier: 0,
  cooldowns: Array(SOLDIERS.length).fill(0),
  running: true
};

// --- Canvas Setup ---
const gameArea = document.getElementById('gameArea');
gameArea.innerHTML = `<canvas id="gameCanvas" width="${GAME_WIDTH}" height="${GAME_HEIGHT}"></canvas>`;
const ctx = document.getElementById('gameCanvas').getContext('2d');

// --- UI Elements ---
const coinsEl = document.getElementById('coins');
const waveEl = document.getElementById('waveNum');
const rebirthsEl = document.getElementById('rebirths');
const bonusEl = document.getElementById('rebirthBonus');
const infoEl = document.getElementById('info');
const rebirthBtn = document.getElementById('rebirthBtn');
const soldiersBar = document.getElementById('soldiersBar');

// --- Initialize Grid ---
function initGrid() {
  state.grid = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    state.grid[r] = [];
    for (let c = 0; c < GRID_COLS; c++) state.grid[r][c] = null;
  }
}
initGrid();

// --- Draw UI: Soldiers Bar ---
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

// --- Place Soldier on Click ---
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

// --- Rebirth ---
rebirthBtn.onclick = ()=>{
  if (state.wave<3) { // must reach wave 3 for this demo
    infoEl.textContent = "Reach at least wave 3 to Rebirth!";
    return;
  }
  state.rebirths += 1;
  state.rebirthBonus = 10*state.rebirths;
  resetGame(true);
  infoEl.textContent = `Rebirth successful! Permanent +${state.rebirthBonus}% coin bonus.`;
};

// --- Enemy Spawning ---
function spawnWave() {
  let waveLevel = state.wave;
  for (let i=0;i<waveLevel+2;i++) {
    setTimeout(()=>{
      let eType = (Math.random()<Math.min(0.2+0.05*waveLevel,0.6)) ? 1 : 0;
      let row = Math.floor(Math.random()*GRID_ROWS);
      let enemy = {...ENEMIES[eType]};
      enemy.x = GAME_WIDTH-10; enemy.y = row*CELL_SIZE+CELL_SIZE/2;
      enemy.row = row;
      enemy.hp = Math.round(enemy.hp*(1+0.15*(waveLevel-1)));
      enemy.id = Math.random();
      state.enemies.push(enemy);
    }, i*800);
  }
}

// --- Game Reset / Rebirth ---
function resetGame(isRebirth) {
  state.grid = [];
  state.soldiers = [];
  state.enemies = [];
  state.wave = 1;
  state.coins = 100 + Math.floor(100*state.rebirths*0.5);
  state.cooldowns = Array(SOLDIERS.length).fill(0);
  initGrid();
  renderSoldiersBar();
  state.running = true;
  if(!isRebirth) state.rebirthBonus = 10*state.rebirths;
}
resetGame(false);

// --- Main Loop ---
function gameLoop() {
  // UI
  coinsEl.textContent = state.coins;
  waveEl.textContent = state.wave;
  rebirthsEl.textContent = state.rebirths;
  bonusEl.textContent = `${state.rebirthBonus}%`;
  // Clear
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
        // HP bar
        ctx.fillStyle="#0f0";
        ctx.fillRect(c*CELL_SIZE+10, r*CELL_SIZE+CELL_SIZE-14, (s.hp/s.hp)*CELL_SIZE-20, 6);
      }
    }
  }
  // Update cooldowns
  for(let i=0;i<state.cooldowns.length;i++)
    if(state.cooldowns[i]>0) state.cooldowns[i]--;

  // Soldiers attack
  for(let s of state.soldiers) {
    if(s.hp<=0) continue;
    if(s.atk>0) {
      // Find nearest enemy in same row
      let targets = state.enemies.filter(e=>e.row===s.row&&e.x>(s.col*CELL_SIZE));
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
    // Medics heal
    if(s.name==="Medic") {
      let all = state.soldiers.filter(o=>Math.abs(o.row-s.row)<=1&&Math.abs(o.col-s.col)<=1 && o.hp>0 && o.id!==s.id);
      for(let o of all) {
        o.hp = Math.min(o.hp+0.2, SOLDIERS.find(sl=>sl.name==="Medic").hp);
      }
    }
  }

  // Enemies move & attack
  for(let e of state.enemies) {
    if(e.hp<=0) continue;
    e.x -= e.speed*2;
    // Collide with soldier?
    let c = Math.floor((e.x-24)/CELL_SIZE);
    if(c>=0 && c<GRID_COLS) {
      let s = state.grid[e.row][c];
      if(s && s.hp>0) {
        s.hp -= e.atk*0.10;
        e.hp -= s.atk*0.20; // retaliation
        if(s.hp<=0) { state.grid[e.row][c]=null; }
        if(e.hp<=0) { continue; }
        e.x += e.speed*1.3; // slow if fighting
      }
    }
    // Base breach
    if(e.x<0) {
      state.running=false;
      infoEl.textContent="Your base was breached! Game Over.";
      return;
    }
  }

  // Remove dead
  state.soldiers = state.soldiers.filter(s=>s.hp>0);
  state.enemies = state.enemies.filter(e=>e.hp>0);

  // Enemies killed: reward coins (with rebirth bonus)
  // (Reward on death)
  // Next wave?
  if(state.running && state.enemies.length===0) {
    setTimeout(()=>{
      state.wave++;
      state.coins += Math.round(state.wave*25*(1+state.rebirthBonus/100));
      spawnWave();
      infoEl.textContent = `Wave ${state.wave}!`;
    }, 900);
  }

  // Draw enemies
  for(let e of state.enemies) {
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(e.x, e.row*CELL_SIZE+CELL_SIZE/2, 22, 0, 2*Math.PI);
    ctx.fill();
    ctx.fillStyle="#fff";
    ctx.font="bold 14px Arial";
    ctx.fillText(e.name[0], e.x-7, e.row*CELL_SIZE+CELL_SIZE/2+7);
    // HP bar
    ctx.fillStyle="#fa0";
    ctx.fillRect(e.x-20, e.row*CELL_SIZE+CELL_SIZE-12, 40*(e.hp/(ENEMIES.find(en=>en.name===e.name).hp)), 5);
  }

  if(state.running)
    requestAnimationFrame(gameLoop);
}

spawnWave();
gameLoop();
