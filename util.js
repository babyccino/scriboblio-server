const port = 8080,
  host = 'localhost';
// host = 'ec2-13-236-152-60.ap-southeast-2.compute.amazonaws.com';

const Tool = {
  pencil: 0,
  eraser: 1,
  bucket: 2,
}

const colorArray = [
  "white",
  "green",
  "indigo",
  "blue",
  "red",
  "gold",
  "orange",
  "black",
  "gray",
]
const Colors = colorArray.reduce((acc, cur, idx) => { acc[cur] = idx; return acc }, {});

// shout outs to JS for not having enums
const actionArray = [
  "batch",

  "notEnoughPlayers",
  "drawerDisconnected",
  "failedServerConnection",

  "chooseUsername",
  "findServer",
  "serverConnected",
  "serverDisconnected",

  "playerConnected",
  "playerDisconnected",
  "playerList",

  "wordList",
  "wordChoice",

  "startMatch",
  "endMatch",
  "startRound",
  "endRound",
  "startGame",
  "endGame",
  "startGuessing",

  "isDrawer",
  "isGuesser",

  "message",
  "correctGuess",

  "tool",
  "strokeColor",
  "strokeWidth",
  "clearCanvas",
  "undo",
  "lastCoords",
  "mouseDown",
  "mouseMove",
  "mouseUp",
];
const ActionTypes = actionArray.reduce((acc, cur, idx) => { acc[cur] = idx; return acc }, {});

const serverFlag = 1 << 7;
const setServerFlag = actionType => actionType |= serverFlag;
const unsetServerFlag = actionType => actionType &= ~serverFlag;
const isMouseAction = action => action.type >= ActionTypes.tool;
// defines actions that only change the canvas i.e. drawing a line
const isDrawingAction = action => action.type >= ActionTypes.mouseDown;
const isLocalAction = action => !(action.type & serverFlag);
const isErrorAction = action => (action.type >= ActionTypes.notEnoughPlayers && action.type <= ActionTypes.drawerDisconnected);

function logAction(action) {
  if (typeof action.type === "string" && action.type.startsWith("@@")) return;
  // console.log("is server:", serverFlag&action.type);
  // convert action to string.
  const type = actionArray[unsetServerFlag(action.type)];
  console.log({ ...action, type });
}

const initialState = {
  messages: [],
  mouseAction: null,
  playerList: [],
  tool: 0,
  strokeWidth: 4,
  strokeColor: "black",
  haveGuessed: false,
  isDrawer: true,
  wordList: [],
  currentlyChoosingWord: false,
  username: "hey",
  clearCanvas: false,
  undo: false,
};

const uri = `http://${host}:${port}`;
module.exports = {
  port,
  host,
  Tool,
  ActionTypes,
  setServerFlag,
  unsetServerFlag,
  isMouseAction,
  isDrawingAction,
  isLocalAction,
  isErrorAction,
  logAction,
  initialState,
  uri,
  colorArray,
  Colors,
};
