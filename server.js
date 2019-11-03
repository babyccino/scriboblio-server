const roundCount = 3;
const wordChoiceTimeout = 5000,
			gameTimeout = 60000;

function randomIntFromInterval(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

const makeEmitAction = (namespace, util) => action => {
	action.type = util.setServerFlag(action.type);
	namespace.emit('action', action);
}
const makeBroadcastAction = (namespace, util) => action => {
	action.type = util.setServerFlag(action.type);
	namespace.broadcast.emit('action', action);
}
/* 
 * Sets a function which will execute when a function of type: ActionType is received.
 * ActionType can also be a function which returns a truthy value.
 * Returns function which when executed will remove the listener that was set when
 * the function was orginially called.
 */
const makeOnAction = (namespace, util) => (actionType, callback) => {
	let func;
	if (typeof(actionType) === "function") {
		func = action => {
			if (actionType(action.type, action)) {
				util.logAction(action);
				return callback(action);
			}
		};
	} else {
		func = action => {
			if (action.type === actionType) {
				util.logAction(action);
				return callback(action);
			}
		};
	}
	namespace.on('action', func);
	return namespace.removeListener.bind(namespace, 'action', func);
}

const makeOnDisconnect = namespace => callback => {
	namespace.on('disconnect', callback);
	return namespace.removeListener.bind(namespace, 'disconnect', callback);
}

module.exports = class GameServer {
	constructor(io, util, updatePlayerCount) {
		this.io = io;
		this.util = util;
		this.updatePlayerCount = updatePlayerCount;

		this.canvasActionList = [],
		this.messageList = [],
		this.playerOrder = [];
		this.gameInProgress = false;

		this.io.emitAction = makeEmitAction(this.io, this.util);
		this.io.on('connection', this.onConnection.bind(this));
	}

	getPlayerScores() {
		return this.playerOrder.map(cur => ({ id: cur.id, username: cur.username, score: cur.score }));
	}

	freshSetupSocket(socket) {
		socket.removeAllListeners();

		socket.emitAction = makeEmitAction(socket, this.util);
		socket.broadcastAction = makeBroadcastAction(socket, this.util);
		socket.onAction = makeOnAction(socket, this.util);
		socket.onDisconnect = makeOnDisconnect(socket);

		socket.onDisconnect(() => {
			this.playerOrder = this.playerOrder.filter(curSocket => socket !== curSocket);
			this.updatePlayerCount(this.playerOrder.length);
			console.log(`Socket disconnected, id: ${socket.id}, username: ${socket.handshake.query.username}`);
		});
	}

	onConnection(socket) {
		console.log(`Socket connected, id: ${socket.id}, username: ${socket.handshake.query.username}`);
		socket.username = socket.handshake.query.username;

		// socket.on('action', action => logAction(action));
		this.freshSetupSocket(socket);

		this.playerOrder.push(socket);
		console.log(this.getPlayerScores());
		socket.emitAction({ type: this.util.ActionTypes.playerList, playerList: this.getPlayerScores() });
		socket.broadcastAction({ type: this.util.ActionTypes.playerConnected, player: { id: socket.id, username: socket.username } });

		if (this.canvasActionList.length > 0)
			socket.emitAction({ type: this.util.ActionTypes.batch, actions: this.canvasActionList });

		if (this.playerOrder.length > 1 && !this.gameInProgress) this.startMatch();

		this.updatePlayerCount(this.playerOrder.length);
	}

	async startMatch() {
		this.gameInProgress = true;
		try {
			for (let i = 0; i < roundCount; ++i) {
				this.preRound();
				await this.round();
				this.postRound();
			}
			 this.endGame(0);
		} catch (e) {
			if (e.message === "notEnoughPlayers") console.log("Not enough players, ending game");
			else console.log(e);
			 this.endGame(1);
		}
	}

	preRound() {
		this.io.emitAction({ type: this.util.ActionTypes.startRound });
		console.log('Pre-round');
	}
	async round() {
		for (let index = 0; index < this.playerOrder.length; ++index) {
			this.preGame();
			const drawerSocket = this.playerOrder[index];
			try {
				await this.game(drawerSocket);
			} catch (e) {
				if (e.message === "drawerDisconnected") {
					this.io.emitAction({ type: this.util.ActionTypes.drawerDisconnected });
					console.log("drawer disconnected");
				} else
					throw e;
			}
		}
	}
	postRound() {
		this.io.emitAction({ type: this.util.ActionTypes.endRound, playerScores: getPlayerScores() });
		console.log('Post-round');
	}

	preGame() {
		this.io.emitAction({ type: this.util.ActionTypes.startGame });
		console.log("Pre-game");
	}
	/*
	*	Throws if there are too few players or if the drawer disconnects.
	*/
	async game(drawerSocket) {
		let timeout;

		const gameEndCode = await new Promise(async res => {
			/* single game setup */
			let removeListeners = [],
				correctGuessers = [];
			let wordChoice;
			let cleanupListeners = () => { };

			const removeDrawerDisconnectListener = drawerSocket.onDisconnect(() => {
				cleanupListeners();
				this.playerOrder.length < 2 ? res(2) : res(1);
			});
			const removeDrawerCanvasListener = drawerSocket.onAction(this.util.isCanvasAction, action => {
				this.canvasActionList.push(action);
				drawerSocket.broadcastAction(action);
			});
			removeListeners.push(removeDrawerDisconnectListener);
			removeListeners.push(removeDrawerCanvasListener);

			const setupGuesserSocket = socket => {
				socket.correctGuess = false;
				const removeGuessListener = socket.onAction(this.util.ActionTypes.message, messageAction => {
					if (!socket.correctGuess && wordChoice && wordChoice === messageAction.message) {
						const correctGuessAction = {
							type: this.util.ActionTypes.correctGuess,
							data: socket.id,
						};
						this.util.logAction(correctGuessAction);
						socket.broadcastAction(correctGuessAction);
						socket.correctGuess = true;
						correctGuessers.push(socket);

						if (correctGuessers.length >= this.playerOrder.length - 1) {
							cleanupListeners();
							res(0);
						}
					}

					this.messageList.push(messageAction);

					if (socket.correctGuess) {
						for (const correctGuesser of correctGuessers)
							correctGuesser.emitAction(messageAction)
					} else
						socket.broadcastAction(messageAction);
				});
				removeListeners.push(removeGuessListener);

				const removeDisconnectListener = socket.onDisconnect(() => {
					correctGuessers = correctGuessers.filter(correctGuesser => correctGuesser != socket);
					socket.broadcastAction({ type: this.util.ActionTypes.playerDisconnected, id: socket.id });
					if (this.playerOrder.length < 2) res(2);
					console.log("Socket disconnected: " + socket.id);
				});
				removeListeners.push(removeDisconnectListener);
			}

			this.io.on('connection', setupGuesserSocket);
			for (const socket of this.playerOrder) {
				if (socket === drawerSocket) continue;
				setupGuesserSocket(socket);
			}

			cleanupListeners = () => {
				for (const removeListener of removeListeners) {
					removeListener();
				}
				if (timeout) clearTimeout(timeout);
				this.io.removeListener('connection', setupGuesserSocket);
			};
			/* * * * * * * * * * */
			// start game

			console.log(drawerSocket.id);
			drawerSocket.emitAction({ type: this.util.ActionTypes.isDrawer });
			drawerSocket.broadcastAction({ type: this.util.ActionTypes.isGuesser });

			/* Get word choice */
			const wordList = this.getWordList();
			const randomWord = wordList[randomIntFromInterval(0, wordList.length - 1)];
			drawerSocket.emitAction({ type: this.util.ActionTypes.wordList, wordList });
			wordChoice = await new Promise(res => {
				let removeWordChoiceListener;
				timeout = setTimeout(() => {
					console.log(`word randomly selected as: ${randomWord}`);

					removeWordChoiceListener();

					drawerSocket.emitAction({ type: this.util.ActionTypes.wordChoice, word: randomWord });

					res(randomWord);
				}, wordChoiceTimeout);
				removeWordChoiceListener = drawerSocket.onAction(this.util.ActionTypes.wordChoice, action => {
					console.log(`word chosen as: ${action.word}`);

					removeWordChoiceListener();
					if (timeout) clearTimeout(timeout);

					res(action.word);
				});
			});
			/* * * * * * * * */

			this.io.emitAction({ type: this.util.ActionTypes.startGuessing });

			timeout = setTimeout(() => {
				cleanupListeners();
				res(0);
			}, gameTimeout);
		});

		if (timeout) clearTimeout(timeout);

		console.log("gameEndCode:", gameEndCode);
		switch (gameEndCode) {
			case 0: return;
			case 1: throw new Error("drawerDisconnected");
			case 2: throw new Error("notEnoughPlayers");
		}
	}
	postGame() {
		this.io.emitAction({ type: this.util.ActionTypes.endGame, playerScores: getPlayerScores() });
		console.log("Post-game");
	}

	getWordList() {
		return ["hey", "yo", "wadup"];
	}

	endGame(code) {
		this.gameInProgress = false;
		this.canvasActionList = [];
		this.messageList = [];

		this.io.emitAction({ type: this.util.ActionTypes.notEnoughPlayers });

		for (const socket of this.playerOrder) {
			this.freshSetupSocket(socket);
		}
	}
}
