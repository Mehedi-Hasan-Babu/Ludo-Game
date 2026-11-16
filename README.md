const BOARD_SIZE = 620;
const TRACK_COUNT = 52;
const PLAYER_COLORS = ["red", "green", "yellow", "blue"];
const PLAYER_LABELS = {
  red: "Red",
  green: "Green",
  yellow: "Yellow",
  blue: "Blue",
};

const SAFE_TRACK_INDEXES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const TRACK_CELLS = [];
const BASE_SLOTS = {};
const HOME_LANE_POSITIONS = {};

const boardElement = document.getElementById("gameBoard");
const trackLayer = document.getElementById("trackLayer");
const tokenLayer = document.getElementById("tokenLayer");
const diceElement = document.getElementById("dice");
const rollBtn = document.getElementById("rollBtn");
const playerCards = document.getElementById("playerCards");
const messageBox = document.getElementById("messageBox");
const newGameBtn = document.getElementById("newGameBtn");

const game = {
  players: [],
  turnIndex: 0,
  currentDie: null,
  lastRoll: null,
  winner: null,
  gameOver: false,
};

function createBoardLayout() {
  // Base areas
  const basePositions = {
    red: { x: 0.17, y: 0.17 },
    green: { x: 0.17, y: 0.83 },
    yellow: { x: 0.83, y: 0.17 },
    blue: { x: 0.83, y: 0.83 },
  };

  for (const color of PLAYER_COLORS) {
    const base = document.createElement("div");
    base.className = `home-base ${color}`;
    boardElement.insertBefore(base, trackLayer);

    const slotPositions = [
      { x: 24, y: 24 },
      { x: 50, y: 24 },
      { x: 24, y: 50 },
      { x: 50, y: 50 },
    ];

    const slots = [];
    slotPositions.forEach((slot) => {
      const marker = document.createElement("div");
      marker.className = "slot";
      marker.style.left = `${slot.x}%`;
      marker.style.top = `${slot.y}%`;
      base.appendChild(marker);
      slots.push({ x: slot.x, y: slot.y });
    });

    BASE_SLOTS[color] = slots.map((slot) => ({
      x: BOARD_SIZE * (basePositions[color].x + slot.x / 100 * 0.44),
      y: BOARD_SIZE * (basePositions[color].y + slot.y / 100 * 0.44),
    }));
  }

  const center = document.createElement("div");
  center.className = "board-center";
  boardElement.insertBefore(center, trackLayer);

  const cx = BOARD_SIZE / 2;
  const cy = BOARD_SIZE / 2;
  const radius = BOARD_SIZE * 0.35;

  for (let i = 0; i < TRACK_COUNT; i += 1) {
    const angle = (-Math.PI / 2) + (i / TRACK_COUNT) * Math.PI * 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    const cell = document.createElement("div");
    cell.className = "track-cell";
    if (SAFE_TRACK_INDEXES.has(i)) cell.classList.add("safe");
    cell.style.left = `${x}px`;
    cell.style.top = `${y}px`;
    TRACK_CELLS.push({ x, y });
    trackLayer.appendChild(cell);
  }

  for (const color of PLAYER_COLORS) {
    const startAngle = {
      red: -Math.PI / 2,
      green: Math.PI / 2,
      yellow: -Math.PI / 2 + Math.PI,
      blue: Math.PI / 2 + Math.PI,
    }[color];

    const lane = [];
    for (let i = 0; i < 6; i += 1) {
      const progress = i / 5;
      const x = cx + Math.cos(startAngle) * (radius * (0.82 - progress * 0.52));
      const y = cy + Math.sin(startAngle) * (radius * (0.82 - progress * 0.52));
      lane.push({ x, y });
    }
    HOME_LANE_POSITIONS[color] = lane;
  }
}

function createPlayers() {
  game.players = PLAYER_COLORS.map((color, index) => ({
    color,
    name: PLAYER_LABELS[color],
    tokens: Array.from({ length: 4 }, (_, tokenIndex) => ({
      id: `${color}-${tokenIndex}`,
      color,
      progress: -1,
      finished: false,
      baseSlot: tokenIndex,
    })),
    turnOrder: index,
  }));
  game.turnIndex = 0;
  game.currentDie = null;
  game.lastRoll = null;
  game.gameOver = false;
  game.winner = null;
}

function renderPlayerCards() {
  playerCards.innerHTML = "";
  game.players.forEach((player, index) => {
    const card = document.createElement("div");
    card.className = `player-card ${index === game.turnIndex && !game.gameOver ? "current" : ""}`;

    const meta = document.createElement("div");
    meta.className = "player-meta";

    const dot = document.createElement("span");
    dot.className = "player-dot";
    dot.style.background = player.color;

    const label = document.createElement("span");
    label.className = "label";
    label.textContent = `${player.name}`;

    meta.appendChild(dot);
    meta.appendChild(label);

    const score = document.createElement("span");
    score.className = "score";
    score.textContent = `${player.tokens.filter((token) => token.finished).length}/4 finished`;

    card.appendChild(meta);
    card.appendChild(score);
    playerCards.appendChild(card);
  });
}

function setMessage(message) {
  messageBox.textContent = message;
}

function getStartIndex(color) {
  return {
    red: 0,
    green: 13,
    yellow: 26,
    blue: 39,
  }[color];
}

function getTrackPosition(color, steps) {
  const startIndex = getStartIndex(color);
  return TRACK_CELLS[(startIndex + steps) % TRACK_COUNT];
}

function getHomeLanePosition(color, laneIndex) {
  return HOME_LANE_POSITIONS[color][laneIndex];
}

function getBaseSlotPosition(color, slotIndex) {
  return BASE_SLOTS[color][slotIndex];
}

function getTokenPosition(token) {
  if (token.progress === -1) {
    return getBaseSlotPosition(token.color, token.baseSlot);
  }

  if (token.progress >= 0 && token.progress < 52) {
    return getTrackPosition(token.color, token.progress);
  }

  if (token.progress >= 52 && token.progress < 57) {
    return getHomeLanePosition(token.color, token.progress - 52);
  }

  return { x: BOARD_SIZE / 2, y: BOARD_SIZE / 2 };
}

function renderTokens() {
  tokenLayer.innerHTML = "";

  for (const player of game.players) {
    for (const token of player.tokens) {
      const tokenElement = document.createElement("button");
      tokenElement.type = "button";
      tokenElement.className = `token ${token.color}`;
      tokenElement.dataset.player = player.color;
      tokenElement.dataset.tokenId = token.id;
      tokenElement.setAttribute("aria-label", `${player.name} token ${token.baseSlot + 1}`);

      const pos = getTokenPosition(token);
      tokenElement.style.left = `${pos.x}px`;
      tokenElement.style.top = `${pos.y}px`;

      tokenElement.addEventListener("click", () => handleTokenClick(token));
      tokenLayer.appendChild(tokenElement);
    }
  }

  highlightPlayableTokens();
}

function highlightPlayableTokens() {
  const tokens = document.querySelectorAll(".token");
  tokens.forEach((tokenEl) => {
    tokenEl.classList.remove("highlighted");
  });

  if (game.currentDie === null || game.gameOver) return;

  const currentPlayer = game.players[game.turnIndex];
  const validIds = currentPlayer.tokens
    .filter((token) => isMoveValid(token, game.currentDie))
    .map((token) => token.id);

  validIds.forEach((tokenId) => {
    const tokenEl = document.querySelector(`.token[data-token-id="${tokenId}"]`);
    if (tokenEl) tokenEl.classList.add("highlighted");
  });
}

function isMoveValid(token, dieValue) {
  if (token.finished) return false;
  if (token.progress === -1) return dieValue === 6;
  return token.progress + dieValue <= 57;
}

function getCurrentPlayer() {
  return game.players[game.turnIndex];
}

function rollDice() {
  if (game.currentDie !== null || game.gameOver) return;

  const value = Math.floor(Math.random() * 6) + 1;
  game.currentDie = value;
  game.lastRoll = value;
  diceElement.textContent = String(value);

  const currentPlayer = getCurrentPlayer();
  const validMoves = currentPlayer.tokens.filter((token) => isMoveValid(token, value));

  if (validMoves.length === 0) {
    setMessage(`${currentPlayer.name} rolled ${value}, and no moves are available.`);
    setTimeout(() => {
      game.currentDie = null;
      diceElement.textContent = "?";
      game.turnIndex = (game.turnIndex + 1) % game.players.length;
      renderPlayerCards();
      renderTokens();
      setMessage(`${getCurrentPlayer().name}'s turn. Roll the dice.`);
    }, 700);
    return;
  }

  setMessage(`${currentPlayer.name} rolled ${value}. Select a highlighted token.`);
  renderPlayerCards();
  renderTokens();
}

function handleTokenClick(token) {
  if (game.currentDie === null || game.gameOver) return;
  const currentPlayer = getCurrentPlayer();
  if (token.color !== currentPlayer.color) return;
  if (!isMoveValid(token, game.currentDie)) return;

  moveToken(token, game.currentDie);
}

function moveToken(token, dieValue) {
  const player = game.players.find((entry) => entry.color === token.color);
  const oldProgress = token.progress;

  if (token.progress === -1) {
    token.progress = 0;
  } else {
    token.progress += dieValue;
  }

  if (token.progress >= 57) {
    token.progress = 57;
    token.finished = true;
  }

  if (token.progress >= 0 && token.progress < 52) {
    const targetTrackIndex = (getStartIndex(token.color) + token.progress) % TRACK_COUNT;
    for (const opponent of game.players) {
      if (opponent.color === token.color) continue;
      for (const enemyToken of opponent.tokens) {
        if (enemyToken.finished || enemyToken.progress < 0 || enemyToken.progress >= 52) continue;
        const enemyTrackIndex = (getStartIndex(enemyToken.color) + enemyToken.progress) % TRACK_COUNT;
        if (enemyTrackIndex === targetTrackIndex) {
          if (!SAFE_TRACK_INDEXES.has(targetTrackIndex)) {
            enemyToken.progress = -1;
            enemyToken.finished = false;
          }
        }
      }
    }
  }

  const rolledSix = dieValue === 6;
  const finishedThisMove = token.finished;

  renderTokens();
  renderPlayerCards();

  if (finishedThisMove) {
    setMessage(`${player.name} finished a token!`);
  } else {
    setMessage(`${player.name} moved a token ${dieValue} spaces.`);
  }

  checkWinner();
  if (game.gameOver) return;

  if (rolledSix) {
    game.currentDie = null;
    diceElement.textContent = "?";
    setMessage(`${player.name} rolled a 6 and gets another turn.`);
    renderTokens();
    return;
  }

  game.currentDie = null;
  diceElement.textContent = "?";
  game.turnIndex = (game.turnIndex + 1) % game.players.length;
  renderPlayerCards();
  renderTokens();
  setMessage(`${getCurrentPlayer().name}'s turn. Roll the dice.`);
}

function checkWinner() {
  const winner = game.players.find((player) => player.tokens.every((token) => token.finished));
  if (!winner) return;
  game.gameOver = true;
  game.winner = winner.color;
  rollBtn.disabled = true;
  setMessage(`${winner.name} wins the game! Click New Game to play again.`);
}

function resetGame() {
  createPlayers();
  renderPlayerCards();
  renderTokens();
  diceElement.textContent = "?";
  game.currentDie = null;
  rollBtn.disabled = false;
  setMessage(`${getCurrentPlayer().name}'s turn. Roll the dice.`);
}

rollBtn.addEventListener("click", rollDice);
newGameBtn.addEventListener("click", resetGame);

createBoardLayout();
createPlayers();
renderPlayerCards();
renderTokens();
setMessage(`${getCurrentPlayer().name}'s turn. Roll the dice.`);
rollBtn.disabled = false;
