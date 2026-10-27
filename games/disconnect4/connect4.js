/**
 * This file contains the interface and rules required
 * to play connect 4 through a simple play() function.
 */

import Game from '../game.js';
import Board from './board.js'

/**
 * The Connect4 class allows manipulation of the board
 * according to the official connect 4 rules.
 */
export default class Connect4 extends Game {

    /**
     * Constructor
     * 
     * @param {Array} players The user object (key: id, value : color)
     */
    constructor(players = {}) {
        super("DisConnect 4", ['r', 'b'], 'r', players)
        this.board = new Board();
        this.positions = [this.board.export()];
        this.players = players;
        this.legalColumns = [1, 2, 3, 4, 5, 6, 7];
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
        if (!this.isPlayer(player) || !this.getTeamsOfPlayer(player).includes(this.side))
            return false;
        this.update();
        this.getLegalColumns();
        if (!this.legalColumns.includes(column))
            return false;
        this.board.insert(column, this.side);
        this.side = this.getNextTeam();
        this.history.push(column);
        this.positions.push(this.board.export());
        this.checkForGameOver();
        return true;
    }

    /**
     * Undoes the last move played.
     * 
     * @param {string} user the user who tries to undo a move
     */
    undo(user) {
        if (!this.mayUndo(user))
            return;
        const last = this.history.pop();
        if (last) {
            this.side = this.getPreviousTeam();
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
     * Checks if 4 pawns are connected
     * 
     * @param {string} side 'r' or 'b'
     * @returns {boolean} 'true' if 'side' wins
     */
    win(side = 'r') {
        return this.board.isWin(side);
    }

    /**
     * Checks if all the board is full
     * 
     * @returns {boolean} 'true' if the board is full
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
            this.winningSides = ['r']
            this.gameOver = true;
            this.reason = "alignement de 4 pions";
            return;
        }
        if (this.win('b')) {
            this.winningSides = ['b']
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
            redWon: this.winningSides.includes('r'),
            blueWon: this.winningSides.includes('b'),
            reason: this.reason
        };
    }

}