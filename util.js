const Tool = {
  pencil: 0,
  eraser: 1,
  bucket: 2,
}

// shout outs to JS for not having enums lol
const actionArray = [
  "playerConnected",
  "playerDisconnected",
  "playerList",
  "chooseUsername",

  "notEnoughPlayers",
  "drawerDisconnected",

  "wordList",
  "wordChoice",

  "startGame",
  "endGame",
  "startRound",
  "endRound",
  "startSingleGame",
  "endSingleGame",
  "startGuessing",

  "isDrawer",
  "isGuesser",

  "message",
  "correctGuess",

  "tool",
  "strokeColor",
  "strokeWidth",
  "drawPencilStart",
  "drawPencilContinue",
  "drawPencilStop",
  "outOfCanvas",
];
const actionTypes = actionArray.reduce((acc, cur, idx) => { acc[cur] = idx; return acc }, {});

const serverFlag = 1 << 7;
function setServerFlag(action) {
  return action |= serverFlag;
}
function unsetServerFlag(action) {
  return action &= ~serverFlag;
}
function isCanvasAction(action) {
  return action >= actionTypes.tool;
}
// defines actions that only change the canvas i.e. drawing a line
function isDrawingAction(action) {
  return action >= actionTypes.drawPencilStart;
}
function isLocalAction(action) {
  return !(action & serverFlag);
}
function isErrorAction(action) {
  return action.type >= actionTypes.notEnoughPlayers &&
    action.type <= actionTypes.drawerDisconnected;
}

function logAction(action) {
  if (typeof action.type === "string" && action.type.startsWith("@@")) return;
  // console.log("is server:", serverFlag&action.type);
  // convert action to string.
  const type = actionArray[unsetServerFlag(action.type)];
  console.log({ ...action, type });
}

module.exports = {
  Tool,
  actionTypes,
  setServerFlag,
  unsetServerFlag,
  isCanvasAction,
  isDrawingAction,
  isLocalAction,
  isErrorAction,
  logAction,
};
