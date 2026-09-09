/**
 * This file contains the interface and rules required
 * to play connect 4 through a simple play() function.
 */

import Board from './board.js'

/**
 * The Connect4 class allows manipulation of the board
 * according to the official connect 4 rules.
 */
export default class Connect4 {

    /**
     * List of users allowed to play on any game.
     */
    static SUPER_USERS = ["DISCONNECT4"];

    /**
     * Constructor
     * 
     * @param {Array} players The user object (key: id, value : color)
     */
    constructor(players = {}) {
        this.board = new Board();
        this.side = 'r'; // red first
        this.positions = [this.board.export()];
        this.gameOver = false;
        this.reason = "";
        this.redWon = false;
        this.blueWon = false;
        this.players = players;
        this.legalColumns = [1, 2, 3, 4, 5, 6, 7];
        this.insertions = []
    }

    /**
     * Attempts to play a move.
     * 
     * @param {string} player the player identifier
     * @param {int} column The column of insertion
     * @returns {boolean} true if the move was played, false otherwise
     */
    play(player, column) {
        if (this.gameOver) return false;
        // Check if the players a registered
        if (!Connect4.SUPER_USERS.includes(player) && (!this.players[player] || (this.players[player] !== '*' && this.players[player] !== this.side)))
            return false;
        this.getLegalColumns();
        if (!this.legalColumns.includes(column))
            return false;
        this.board.insert(column, this.side);
        this.side = this.oppositeSide();
        this.insertions.push(column);
        this.positions.push(this.board.export());
        this.checkForGameOver();
        return true;
    }

    /**
     * Undoes the last move played.
     */
    undo() {
        if (this.gameOver)
            return;
        const last = this.insertions.pop();
        if (last) {
            this.side = this.oppositeSide();
            this.board.remove(last);
            this.positions.pop();
            this.getLegalColumns();
        }
    }

    /**
     * Change & return all the legal columns
     * 
     * @returns {Array} Array of legal moves
     */
    getLegalColumns() {
        this.legalColumns = this.board.getLegalColumns();
        return this.legalColumns;
    }

    /**
     * Displays the board in the console.
     */
    displayBoard() {
        console.log(this.board.toString());
    }

    /**
     * Returns the opposite side of the current player.
     * 
     * @returns {string} 'r' or 'b'
     */
    oppositeSide() {
        return Connect4.oppositeSide(this.side);
    }

    /**
     * Returns the opposite side of the given side.
     * Defaults to red if the input is invalid.
     * 
     * @param {string} side
     * @returns {string} 'r' or 'b'
     */
    static oppositeSide(side) {
        return side === 'r' ? 'b' : 'r';
    }

    /**
     * Checks if 4 pawns are connected
     * 
     * @param {string} side 'r' or 'b'
     */
    win(side = 'r') {
        return this.board.isWin(side);
    }

    /**
     * Checks if all the board is full
     */
    draw() {
        return this.board.isFull();
    }

    /**
     * check if the game is over
     */
    checkForGameOver() {
        if (this.gameOver) return;
        if (this.win('r')) {
            this.redWon = true;
            this.gameOver = true;
            this.reason = "alignement de 4 pions";
            return;
        }
        if (this.win('b')) {
            this.blueWon = true;
            this.gameOver = true;
            this.reason = "alignement de 4 pions";
            return;
        }
        if (this.draw()) {
            this.gameOver = true;
            this.reason = "manque de place";
        }
    }

    /**
     * return an object that contains:
     * - the initiative
     * - who won
     * - why
     * 
     * @param reload (boolean) 'true' to reload the valid columns
     * @return {Object} the final object
     */
    getState(reload = false) {
        if (reload) {
            this.getLegalColumns();
        }
        this.checkForGameOver();
        return {
            gameOver: this.gameOver,
            opportunity: this.side,
            redWon: this.redWon,
            blueWon: this.blueWon,
            reason: this.reason
        };
    }

    /**
 * Attempt to add a player to the game
 * 
 * @param {string} player the player id
 * @param {int} roles the number of roles that a player will have (max. 2)
 * @return {boolean} true if the player can play, false otherwise
 */
    addPlayer(player, roles) {
        if (Connect4.SUPER_USERS.includes(player)) return true;
        if (Object.keys(this.players).includes(player)) return true;
        if (!this.isPlayable()) return false;
        if (Object.keys(this.players).length === 0 && roles > 1)
            this.players[player] = '*';
        else
            this.players[player] = Object.keys(this.players).length === 0 ? 'r' : 'b';
        return true;
    }

    /**
     * return true if new players are accepted
     * 
     * @returns {boolean} true if new players can be accepted
     */
    isPlayable() {
        if (this.getPlayers().filter(player => player.color === '*').length > 0) return false;
        return Object.keys(this.getPlayers()).length <= 1;
    }

    /**
     * get the list of players and their permissions
     * 
     * @return {array} a list of player
     */
    getPlayers() {
        const players = [];
        Object.keys(this.players).forEach(player => {
            players.push({ player: player.valueOf(), color: this.players[player].valueOf() });
        });
        return players;
    }

    /**
     * get the color of a player
     * 
     * @param {string} player the player id
     * @return {string|false} the color of a player or false if he doesn't exist
     */
    getPlayer(player) {
        return this.players[player] ?? false;
    }

    /**
     * invert the user colors and return the user object
     * 
     * @return {*} a new user object
     */
    getInvertedUser() {
        const users = JSON.parse(JSON.stringify(this.players));
        Object.keys(users).forEach(key => {
            if (users[key] === 'r') users[key] = 'b';
            else if (users[key] === 'b') users[key] = 'r';
        });
        return users
    }

    /**
     * know if an id is registered as a player
     * 
     * @param {string} id the purported player's id
     * @return {boolean} true if id is registered
     */
    isPlayer(id) {
        let isAPlayer = false;
        this.getPlayers().forEach(player => {
            if (player.player === id)
                isAPlayer = true;
        });
        return isAPlayer;
    }

    /**
     * export all the past & current board position
     */
    getPositions() {
        return this.positions;
    }

    /**
     * resign a game
     * 
     * @param {string} side the side
     */
    resign(side) {
        if (!side) return;
        this.gameOver = true;
        this.reason = "abandon";
        if (side === 'r') this.blueWon = true;
        if (side === 'b') this.redWon = true;
    }

}