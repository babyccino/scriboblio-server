const port = 8080,
      host = '10.0.0.69';

const initialState = {
  messages: [],
  canvasActions: [],
  playerList: [],
  tool: 0,
  strokeWidth: 4,
  strokeColor: "black",
  haveGuessed: false,
  isDrawer: false,
  wordList: [],
  currentlyChoosingWord: false,
  username: "",
};

module.exports = {
  port,
  host,
  initialState,
  uri: `http://${host}:${port}`
};
