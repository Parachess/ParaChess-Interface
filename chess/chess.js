/**
 * This file contains the interface and rules required
 * to play chess through a simple play() function.
 */

import Board from "./board.js";
import { Bishop, Pawn, Queen, King, Knight, Rook } from './piece.js';
import Actions from './actions.js';
import { spawn } from 'child_process';

/**
 * piece allowed during promotions
 */
const PROMOTIONS_PIECES = ["n", "N", "b", "B", "r", "R", "q", "Q"];
export const PROMOTIONS_PIECES_NAME = ["tour", "cavalier", "fou", "dame"];

/**
 * The Chess class allows manipulation of the chessboard
 * according to the official chess rules.
 */
export class Chess {

    /**
     * List of users allowed to play on any game.
     */
    static SUPER_USERS = ["PARACHESS"];

    /**
     * The initial position's FEN code
     */
    static DEFAULT_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    /**
    * The initial evaluation given by Stockfish 18 (depth = 25)
    */
   static DEFAULT_EVAL = {
    white: 6.8,
    draw: 92.6,
    black: .6,
    p: .32
   };

    /**
     * Constructor
     * 
     * @param {*} onEval Method called when the position is newly calculated
     * @param {string} fen Initial position in FEN notation
     * @param {array} players The user object (key: id, value: color)
     */
    constructor(onEval, fen = Chess.DEFAULT_FEN, players = {}) {
        this.history = [];
        this.initialFen = fen;
        this.capturedPieces = [];
        this.board = new Board(fen.split(" ")[0]);
        this.side = Chess.loadFenInitiative(fen);
        this.enPassant = Chess.loadFenEnPassant(fen);
        this.castling = Chess.loadFenCastling(fen);
        this.fullMoveNumber = Chess.loadFenFullMoves(fen);
        this.halfMoveNumber = Chess.loadFenHalfMoves(fen);
        this.simulating = false;
        this.positions = [this.board.export()];
        this.currentLegalMoves = {
            w: [],
            b: []
        };
        this.gameOver = false;
        this.reason = "";
        this.whiteWon = false;
        this.blackWon = false;
        this.getAllLegalMoves();
        this.fenPiecesHistory = [];
        this.players = players;
        this.eval = this.evalPosition();
        this.onEval = onEval;
        this.engine = spawn("stockfish");
        this.lastEval = null;
        this.lastMoveTime = Date.now();
        this.engine.stdout.on("data", (data) => {

            const text = data.toString();
            const match1 = text.match(/wdl (\d+) (\d+) (\d+)/);
            const match2 = text.match(/score cp (-?\d+)/);
            if (match1 && match2) {
                this.lastEval = {
                    white: this.side === 'w' ? Number(match1[1]) / 10 : Number(match1[3]) / 10,
                    draw: Number(match1[2]) / 10,
                    black: this.side === 'w' ? Number(match1[3]) / 10 : Number(match1[1]) / 10,
                    p: Number(match2[1]) / 100
                };
            }
            if (text.includes("bestmove")) {
                this.eval = this.lastEval;
                this.onEval(this.eval);
                console.log('[Stockfish] Computation over');
            }
        });
        this.engine.stdin.write("uci\n");
        this.engine.stdin.write("setoption name UCI_ShowWDL value true\n");
        this.engine.stdin.write("setoption name Threads value 4\n");
        this.engine.stdin.write("setoption name Hash value 512\n");
        this.engine.stdin.write("setoption name MultiPV value 1\n");
        this.engine.stdin.write(`position fen ${this.initialFen}`);
        if (this.initialFen === Chess.DEFAULT_FEN)
            this.eval = Chess.DEFAULT_EVAL;
        else
            this.evalPosition();
    }

    /**
     * Determines which side has the move according to a FEN string.
     * 
     * @param {string} fen FEN string
     * @returns {string} 'w' for white, 'b' for black
     */
    static loadFenInitiative(fen) {
        const splitted = fen?.split(" ");
        if (splitted.length <= 0) return 'w';
        return (splitted[1] === 'b') ? 'b' : 'w';
    }

    /**
     * Determines castling rights according to a FEN string.
     * 
     * @param {string} fen FEN string
     * @returns {object} Object containing the four castling rights
     */
    static loadFenCastling(fen) {
        const def = {
            whiteQueenCastle: true,
            whiteKingCastle: true,
            blackQueenCastle: true,
            blackKingCastle: true
        };
        const splitted = fen?.split(" ");
        if (splitted.length <= 1) return def;
        const castling = splitted[2];
        let Q = false;
        let K = false;
        let q = false;
        let k = false;
        if (castling.includes("K")) K = true;
        if (castling.includes("k")) k = true;
        if (castling.includes("Q")) Q = true;
        if (castling.includes("q")) q = true;
        return {
            whiteQueenCastle: Q,
            whiteKingCastle: K,
            blackQueenCastle: q,
            blackKingCastle: k
        };
    }

    /**
     * Extracts the en-passant target square from a FEN string.
     * 
     * @param {string} fen FEN string
     * @returns {string|null} Target square in algebraic notation or null
     */
    static loadFenEnPassant(fen) {
        const splitted = fen?.split(" ");
        if (splitted.length <= 2) return null;
        return splitted[3];
    }

    /**
         * Extracts the half move number from a FEN string.
         * 
         * @param {string} fen FEN string
         * @returns {int|null} the half move number or null
         */
    static loadFenHalfMoves(fen) {
        const splitted = fen?.split(" ");
        if (splitted.length <= 3) return null;
        return Number(splitted[4]);
    }

    /**
     * Extracts the full move number from a FEN string.
     * 
     * @param {string} fen FEN string
     * @returns {int|null} the full move number or null
     */
    static loadFenFullMoves(fen) {
        const splitted = fen?.split(" ");
        if (splitted.length <= 4) return null;
        return Number(splitted[5]);
    }

    /**
     * Attempts to play a move.
     * 
     * @param {string} player the player identifier
     * @param {string} from Starting square (or "O-O"/"O-O-O" for castling)
     * @param {string} to Destination square
     * @param {string|null} promotion Promotion piece ('k','b','r','q'), null by default
     * @returns {boolean} true if the move was played, false otherwise
     */
    play(player, from, to, promotion = 'q') {
        if (this.gameOver) return false;
        // Check if the players a registered
        if (!Chess.SUPER_USERS.includes(player) && (!this.players[player] || (this.players[player] !== '*' && this.players[player] !== this.side)))
            return false;
        this.getAllLegalMoves();
        const moveOptions = this.processMoveOptions(from, to, promotion);
        if (moveOptions.action & Actions.PROMOTION && !PROMOTIONS_PIECES.includes(promotion))
            return false;
        const isMoveValid = this.currentLegalMoves[this.side].some(move => move.from === from && move.to === to && move.action === moveOptions.action);
        if (!isMoveValid) return false;
        if (!this.move({
            from,
            to,
            ...moveOptions
        })) return false;
        this.fiftyMove({ piece: this.board.get(to), action: moveOptions.action });
        this.fullMoveNumber += 1;
        const fen = this.board.toFen();
        this.fenPiecesHistory.push(fen);
        this.lastMoveTime = Date.now();
        this.engine?.stdin.write('stop\n');
        this.engine?.stdin.write('move ' + from + to + "\n");
        this.evalPosition();
        this.positions.push(this.board.export());
        return true;
    }

    /**
     * process the correct move option
     * 
     * @param {string} from the initial square
     * @param {string} to the final square
     * @returns {int} the move actions
     */
    processMoveOptions(from, to, promotion) {
        const moveOptions = { action: Actions.MOVE };
        if (from === "e1" && to === "g1" && this.side === 'w' && this.checkShortCastling('w')) moveOptions.action |= Actions.K_CASTLE;
        if (from === "e1" && to === "c1" && this.side === 'w' && this.checkLongCastling('w')) moveOptions.action |= Actions.Q_CASTLE;
        if (from === "e8" && to === "g8" && this.side === 'b' && this.checkShortCastling('b')) moveOptions.action |= Actions.K_CASTLE;
        if (from === "e8" && to === "c8" && this.side === 'b' && this.checkLongCastling('b')) moveOptions.action |= Actions.Q_CASTLE;

        if (this.board.get(to) !== null && this.board.get(to).color !== this.side)
            moveOptions.action |= Actions.CAPTURE;
        if (this.board.get(from) instanceof Pawn && to === this.enPassant)
            moveOptions.action |= Actions.EP_CAPTURE;
        if (this.board.get(from) instanceof Pawn && (to[1] === '8' || to[1] === '1')) {
            moveOptions.promotion = promotion;
            moveOptions.action |= Actions.PROMOTION;
        }
        return moveOptions;
    }

    /**
     * Tries to castle if this is the required move.
     * 
     * @param {object} move Move descriptor
     * @returns {boolean} true if the castle was executed, false otherwise
     */
    tryCastling({ from, to, action, promotion }) {
        if (action & Actions.Q_CASTLE) {
            if (this.longCastling(this.side)) {
                if (this.side === 'w') this.updateCastlingRights(from, to, true, false);
                else this.updateCastlingRights(from, to, false, true);
                this.side = this.oppositeSide();
                this.history.push({ from: (this.side === "w" ? "e1" : "e8"), to: (this.side === "w" ? "c1" : "c8"), action: Actions.Q_CASTLE, castling: { ...this.castling }, enPassant: null });
                if (!this.simulating) {
                    this.checkForGameOver();
                }
                return true;
            }
            return false;
        }

        if (action & Actions.K_CASTLE) {
            if (this.shortCastling(this.side)) {
                if (this.side === 'w') this.updateCastlingRights(from, to, true, false);
                else this.updateCastlingRights(from, to, false, true);
                this.side = this.oppositeSide();
                this.history.push({ from: (this.side === "w" ? "e1" : "e8"), to: (this.side === "w" ? "g1" : "g8"), action: Actions.K_CASTLE, castling: { ...this.castling }, enPassant: null });
                if (!this.simulating) {
                    this.checkForGameOver();
                }
                return true;
            }
            return false;
        }
    }

    /**
     * Executes a move that has already been validated.
     * 
     * @param {object} move Move descriptor
     * @returns {boolean} true if the move was executed, false otherwise
     */
    move({ from, to, action, promotion }) {
        const move = { from, to, action };

        if (this.tryCastling({ from, to, action, promotion })) return true;

        if (!Board.isValidSquare(from) || !this.board.isOccupied(from)) return false;

        const piece = this.board.get(from);
        const fromColor = this.board.get(from).color;

        if (fromColor !== this.side) return false;

        this.board.set(from, null);

        if (this.board.isOccupied(to) && this.board.get(to).color !== fromColor) {
            const capturedPiece = this.board.get(to);
            this.capturedPieces.push(capturedPiece);
            move.captured = capturedPiece;
        }


        const jump = Number(to[1]) - Number(from[1]);

        if (piece instanceof Pawn && Math.abs(jump) === 2) {
            const mid = (Number(to[1]) + Number(from[1])) / 2;
            this.enPassant = from[0] + String(mid);
            move.enPassant = this.enPassant.valueOf();
        } else {
            this.enPassant = null;
            move.enPassant = null;
        }

        this.board.set(to, piece);
        this.side = this.oppositeSide();

        if (action & Actions.PROMOTION) {
            if (!promotion || (promotion.toLowerCase() !== 'b' && promotion.toLowerCase() !== 'n' && promotion.toLowerCase() !== 'r' && promotion.toLowerCase() !== 'q'))
                return false;
            this.board.set(
                to,
                Chess.createPiece(
                    piece.color === 'w'
                        ? promotion.toUpperCase()
                        : promotion.toLowerCase()
                )
            );
        }

        if (action & Actions.EP_CAPTURE) {
            this.board.set(to[0] + from[1], null);
        }

        this.updateCastlingRights(from, to);

        move.castling = { ... this.castling }
        this.history.push(move);
        if (!this.simulating) {
            this.checkForGameOver();
        }
        return true;
    }

    /**
     * process the castling rights
     * 
     * @param {string} from the initial square
     * @param {string} to the final square
     * @param {boolean} lockWhite completely lock white catling rights
     * @param {boolean} lockBlack completely lock white catling rights
     */
    updateCastlingRights(from, to, lockWhite = false, lockBlack = false) {

        if (from === 'e1' | lockWhite) {
            this.castling.whiteKingCastle = false;
            this.castling.whiteQueenCastle = false;

        } else if (from === 'e8' | lockBlack) {
            this.castling.blackKingCastle = false;
            this.castling.blackQueenCastle = false;
            return;
        }
        else if (from === 'a1' || to === 'a1') this.castling.whiteQueenCastle = false;
        else if (from === 'a8' || to === 'a8') this.castling.blackQueenCastle = false;
        else if (from === 'h1' || to === 'h1') this.castling.whiteKingCastle = false;
        else if (from === 'h8' || to === 'h8') this.castling.blackKingCastle = false;

    }

    /**
     * Creates a Piece instance from a character.
     * Uppercase letters represent white pieces,
     * lowercase letters represent black pieces.
     * 
     * Supported pieces:
     *  - q : Queen
     *  - b : Bishop
     *  - n : Knight
     *  - r : Rook
     * 
     * @param {string} char Character representing the piece
     * @returns {Piece|null} The corresponding piece instance
     */
    static createPiece(char) {
        if (char === 'Q') return new Queen('w');
        if (char === 'q') return new Queen('b');
        if (char === 'R') return new Rook('w');
        if (char === 'r') return new Rook('b');
        if (char === 'N') return new Knight('w');
        if (char === 'n') return new Knight('b');
        if (char === 'B') return new Bishop('w');
        if (char === 'b') return new Bishop('b');
        return null;
    }

    /**
     * Undoes the last move played.
     * 
     * @param {boolean} evalPosition evaluate the game after removing the last move
     * @param {boolean} removePosition remove the position from the fen code
     */
    undo(evalPosition=false, removePosition=false) {
        const move = this.history.pop();
        if (!move) return;
        if (removePosition) {
            this.fenPiecesHistory?.pop();
            this.positions?.pop();
        }
        
        const { from, to, action } = move;

        if (this.history.length > 1) {
            this.castling = { ...this.history[this.history.length - 1].castling };
            this.enPassant = this.history[this.history.length - 1].enPassant;
        } else {
            this.castling = Chess.loadFenCastling(this.initialFen);
            this.enPassant = Chess.loadFenEnPassant(this.initialFen);
        }

        if (action & Actions.K_CASTLE) {
            if (from[1] === '1') {
                this.board.set('e1', new King('w'));
                this.board.set('g1', null);
                this.board.set('h1', new Rook('w'));
                this.board.set('f1', null);
            } else {
                this.board.set('e8', new King('b'));
                this.board.set('g8', null);
                this.board.set('h8', new Rook('b'));
                this.board.set('f8', null);
            }
            if (evalPosition) this.evalPosition();
            return;
        }

        if (action & Actions.Q_CASTLE) {
            if (from[1] === '1') {
                this.board.set('e1', new King('w'));
                this.board.set('c1', null);
                this.board.set('a1', new Rook('w'));
                this.board.set('d1', null);
            } else {
                this.board.set('e8', new King('b'));
                this.board.set('c8', null);
                this.board.set('a8', new Rook('b'));
                this.board.set('d8', null);
            }
            if (evalPosition) this.evalPosition();
            return;
        }

        const movedPiece = this.board.get(to);

        this.board.set(from, movedPiece);
        this.board.set(to, null);

        this.side = this.oppositeSide();

        if (move.action & Actions.CAPTURE) this.board.set(to, move.captured);
        else if (move.action & Actions.EP_CAPTURE) this.board.set(to[0] + from[1], new Pawn(Chess.oppositeSide(movedPiece.color)));
        if (move.action & Actions.PROMOTION) this.board.set(from, new Pawn(movedPiece.color));
        if (evalPosition) this.evalPosition();
    }

    /**
     * Checks whether a king is in check.
     * By default, checks the side to move.
     * 
     * @param {string} side 'w' for white, 'b' for black
     * @returns {boolean} true if the king is in check
     */
    isCheck(side = this.side) {
        const kingSquare = this.board.getKingSquare(side);
        return this.board.isControlled(kingSquare, Chess.oppositeSide(side));
    }

    /**
     * Returns all legal moves starting from a given square.
     * 
     * @param {string} pos Starting square
     * @param {string} enPassant current en-passant square
     * @returns {Array} Array of legal moves
     */
    getLegalMoves(pos, enPassant) {
        const legal = [];
        if (!Board.isValidSquare(pos)) return [];

        const pseudoLegalMoves = this.board.getPseudoLegalMoves(pos, enPassant);
        for (const move of pseudoLegalMoves) {
            const prevSide = this.side;
            this.simulating = true;
            this.move(move);
            this.simulating = false;
            if (!this.isCheck(prevSide)) legal.push(move);
            this.undo();
        }
        return legal;
    }

    /**
     * Returns all legal moves for a given side.
     * By default, for the side to move.
     * 
     * @param {string} enPassant the current en-passant square
     * @param {string} side 'w' for white, 'b' for black
     * @returns {Array} Array of legal moves
     */
    getAllLegalMoves(enPassant = this.enPassant, side = this.side) {
        const squares = Board.getAllSquares();
        let moves = [];
        for (const square of squares) {
            if (this.board.isOccupied(square) && this.board.get(square).color === side) {
                moves.push(...this.getLegalMoves(square, enPassant));
            }
        }
        if (this.checkShortCastling(side)) moves.push({ from: (side === "w" ? "e1" : "e8"), to: (side === "w" ? "g1" : "g8"), action: Actions.MOVE | Actions.K_CASTLE });
        if (this.checkLongCastling(side)) moves.push({ from: (side === "w" ? "e1" : "e8"), to: (side === "w" ? "c1" : "c8"), action: Actions.MOVE | Actions.Q_CASTLE });
        this.currentLegalMoves[side] = moves;
        return moves;
    }

    /**
     * Performs short (king-side) castling if legal.
     * 
     * @param {string} side 'w' or 'b'
     * @returns {boolean} true if castling was performed
     */
    shortCastling(side = this.side) {
        if (!this.checkShortCastling(side) || side !== this.side)
            return false;
        if (side === 'w') {
            this.board.set('e1', null);
            this.board.set('g1', new King('w'));
            this.board.set('h1', null);
            this.board.set('f1', new Rook('w'));
            return true;
        }
        if (side === 'b') {
            this.board.set('e8', null);
            this.board.set('g8', new King('b'));
            this.board.set('h8', null);
            this.board.set('f8', new Rook('b'));
            return true;
        }
        return false;
    }

    /**
     * Performs long (queen-side) castling if legal.
     * 
     * @param {string} side 'w' or 'b'
     * @returns {boolean} true if castling was performed
     */
    longCastling(side = this.side) {
        if (!this.checkLongCastling(side) || side !== this.side)
            return false;
        if (side === 'w') {
            this.board.set('e1', null);
            this.board.set('c1', new King('w'));
            this.board.set('a1', null);
            this.board.set('d1', new Rook('w'));
            return true;
        }
        if (side === 'b') {
            this.board.set('e8', null);
            this.board.set('c8', new King('b'));
            this.board.set('a8', null);
            this.board.set('d8', new Rook('b'));
            return true;
        }
        return false;
    }

    /**
     * Check if the short castle is valid
     * 
     * @param {string} side the side ('w' for white, 'b' for black)
     * @returns {boolean} 'true' if the short castle is valid
     */
    checkShortCastling(side = this.side) {
        if (this.isCheck(side)) {
            return false;
        }
        return (side === 'w' && this.castling.whiteKingCastle && !this.board.isOccupied('g1') && !this.board.isOccupied('f1') && !this.board.isControlled('f1', this.oppositeSide(side)) && !this.board.isControlled('g1', this.oppositeSide(side))) ||
            (side === 'b' && this.castling.blackKingCastle && !this.board.isOccupied('g8') && !this.board.isOccupied('f8') && !this.board.isControlled('f8', this.oppositeSide(side)) && !this.board.isControlled('g8', this.oppositeSide(side)));
    }

    /**
     * Check if the long castle is valid
     * 
     * @param {string} side the side ('w' for white, 'b' for black)
     * @returns {boolean} 'true' if the long castle is valid
     */
    checkLongCastling(side = this.side) {
        if (this.isCheck(side)) {
            return false;
        }
        return (side === 'w' && this.castling.whiteQueenCastle && !this.board.isOccupied('b1') && !this.board.isOccupied('c1') && !this.board.isOccupied('d1') && !this.board.isControlled('c1', this.oppositeSide(side)) && !this.board.isControlled('d1', this.oppositeSide(side))) ||
            (side === 'b' && this.castling.blackQueenCastle && !this.board.isOccupied('b8') && !this.board.isOccupied('c8') && !this.board.isOccupied('d8') && !this.board.isControlled('c8', this.oppositeSide(side)) && !this.board.isControlled('d8', this.oppositeSide(side)));
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
     * @returns {string} 'w' or 'b'
     */
    oppositeSide() {
        return Chess.oppositeSide(this.side);
    }

    /**
     * Returns the opposite side of the given side.
     * Defaults to white if the input is invalid.
     * 
     * @param {string} side
     * @returns {string} 'w' or 'b'
     */
    static oppositeSide(side) {
        return side === 'w' ? 'b' : 'w';
    }

    /**
     * Checks whether a side is in checkmate.
     * 
     * @param {string} side 'w' or 'b'
     * @returns {boolean} true if checkmate
     */
    checkmate(side = this.side) {
        return this.currentLegalMoves[side]?.length === 0 && this.isCheck(side);
    }

    /**
     * Checks whether a side is in stalemate.
     * 
     * @param {string} side 'w' or 'b'
     * @returns {boolean} true if stalemate
     */
    stalemate(side = this.side) {
        return this.currentLegalMoves[side]?.length === 0 && !this.isCheck(side);
    }

    /**
     * check if the game is over
     */
    checkForGameOver() {
        if (this.gameOver) return;
        this.getAllLegalMoves(this.enPassant, this.side);
        if (this.checkmate('w')) {
            this.blackWon = true;
            this.gameOver = true;
            this.reason = "échec et mat";
            return;
        }
        if (this.checkmate('b')) {
            this.whiteWon = true;
            this.gameOver = true;
            this.reason = "échec et mat";
        }
        if (this.stalemate(this.side)) {
            this.gameOver = true;
            this.reason = "pat";
        }
        if (this.halfMoveNumber >= 75) {
            this.gameOver = true;
            this.reason = "règle des 50 coups";
        }
        if (this.threefoldRepetition()) {
            this.gameOver = true;
            this.reason = "répétition";
        }
        if (this.insufficientMaterial()) {
            this.gameOver = true;
            this.reason = "manque de matériel";
        }
    }

    /**
     * return an object that contains:
     * - the initiative
     * - who won
     * - why
     * 
     * @param reload (boolean) 'true' to reload the legal moves
     * @return {Object} the final object
     */
    getState(reload = false) {
        if (reload) {
            this.getAllLegalMoves(this.enPassant, this.side);
            this.getAllLegalMoves(this.enPassant, this.oppositeSide());
        }

        this.checkForGameOver();
        return {
            gameOver: this.gameOver,
            opportunity: this.side,
            whiteWon: this.whiteWon,
            blackWon: this.blackWon,
            reason: this.reason,
            opportunity: this.side,
            whiteKingCheck: (this.isCheck('w') ? this.board.getKingSquare('w') : 'null'),
            blackKingCheck: (this.isCheck('b') ? this.board.getKingSquare('b') : 'null')
        };
    }

    /**
     * count the fifty move rule
     * 
     * @param {*} the piece moved and the actions performed 
     */
    fiftyMove({ piece, action }) {
        const isPawn = piece instanceof Pawn;
        if (Actions.CAPTURE & action || isPawn)
            this.halfMoveNumber = 0;
        else if (this.side === "b")
            this.halfMoveNumber += 1;
    }

    threefoldRepetition() {
        const fen = this.board.toFen();
        if (this.fenPiecesHistory.filter(historyFen => fen === historyFen).length >= 5) return true;

        return false;
    }

    /**
     * export the FEN code of the game
     */
    toFen() {
        let fen = this.board.toFen();
        fen += " " + this.side + " ";
        let oneCastlingAvailable = false;
        if (this.castling.whiteKingCastle) {
            fen += "K";
            oneCastlingAvailable = true;
        }
        if (this.castling.whiteQueenCastle) {
            fen += "Q";
            oneCastlingAvailable = true;
        }
        if (this.castling.blackKingCastle) {
            fen += "k";
            oneCastlingAvailable = true;
        }
        if (this.castling.blackQueenCastle) {
            fen += "q";
            oneCastlingAvailable = true;
        }
        if (!oneCastlingAvailable) fen += "-"
        fen += " ";
        fen += this.enPassant ?? "-";
        fen += " ";
        fen += this.halfMoveNumber + " ";
        fen += this.fullMoveNumber;
        return fen;
    }

    /**
     * Attempt to add a player to the game
     * 
     * @param {string} player the player id
     * @return {boolean} true if the player can play, false otherwise
     */
    addPlayer(player) {
        if (Chess.SUPER_USERS.includes(player)) return true;
        if (Object.keys(this.players).includes(player)) {
            if (Object.keys(this.players).length === 1)
                this.players[player] = '*';
            return true;
        }
        if (!this.isPlayable()) return false
        this.players[player] = Object.keys(this.players).length === 0 ? 'w' : 'b';
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
            if (users[key] === 'w') users[key] = 'b';
            else if (users[key] === 'b') users[key] = 'w';
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
     * evaluate the game
     */
    evalPosition() {
        if(process.env.STOCKFISH === "NO") return;
        this.engine?.stdin.write("go depth 35\n");
    }

    /**
     * get the current evaluation value
     * 
     * @return {float} the eval
     */
    getEval() {
        return this.eval;
    }

    /**
     * executed when a new eval is completed
     */
    onEval() {
    }

    /**
     * close Stockfish
     */
    clear() {
        this.engine.stdin.write('stop\n');
        this.engine.stdin.write('quit\n');
    }

    /**
     * export all the past & current board position
     */
    getPositions() {
        return this.positions;
    }

    /**
     * check for insufficient material
     * 
     * @param {string} side the side to analyse
     * @return {boolean} true if mating is impossible
     */
    insufficientMaterial(side=null) {
        if (side === null) 
            return this.insufficientMaterial('w') && this.insufficientMaterial('b');
        let rooks = 0;
        let knights = 0;
        let bishops = 0;
        let queens = 0;
        let pawns = 0;
        const rook = side === 'w' ? 'R'  : 'r';
        const knight = side === 'w' ? 'N' : 'n';
        const bishop = side === 'w' ? 'B' : 'b';
        const queen = side === 'w' ? 'Q'  : 'q';
        const pawn = side === 'w' ? 'P'  : 'p';
        this.board.board.forEach(row => {
            row.forEach(square => {
                if (square?.getSymbol() === rook) rooks += 1;
                else if (square?.getSymbol() === knight) knights += 1;
                else if (square?.getSymbol() === bishop) bishops += 1;
                else if (square?.getSymbol() === queen) queens += 1;
                else if (square?.getSymbol() === pawn) pawns += 1;
            });
        });
        return pawns === 0 && rooks === 0 && queens === 0 && ((bishops <= 2 && knights === 0) || (knights <= 2 && bishops === 0))
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
        if (side === 'w') this.blackWon = true;
        if (side === 'b') this.whiteWon = true;
    }

}