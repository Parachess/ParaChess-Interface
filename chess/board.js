/**
 * This file contains the Board class implementation.
 */

import { Rook, Knight, Bishop, Queen, King, Pawn } from "./piece.js";
import Actions from './actions.js';

/**
 * The Board class represents the chessboard.
 * It provides all necessary methods to interact with it.
 */
export default class Board {

    /**
     * Constructor.
     * 
     * @param {string} fen Piece placement in FEN format (board part only)
     */
    constructor(fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR") {
        this.board = this.constructor.generateEmptyBoard();
        this.fromFen(fen);
    }

    /**
     * Builds the board position from a FEN string (piece placement only).
     * 
     * @param {string} fen FEN piece placement string
     */
    fromFen(fen) {
        const lines = fen.split("/");
        let y = 8;
        lines.forEach(line => {
            const squares = line.split("");
            let x = 0;
            squares.forEach(square => {
                const lower = square.toLowerCase();
                if (lower === "r") this.set("abcdefgh"[x] + y, new Rook(square === "R" ? "w" : "b"));
                else if (lower === "n") this.set("abcdefgh"[x] + y, new Knight(square === "N" ? "w" : "b"));
                else if (lower === "b") this.set("abcdefgh"[x] + y, new Bishop(square === "B" ? "w" : "b"));
                else if (lower === "q") this.set("abcdefgh"[x] + y, new Queen(square === "Q" ? "w" : "b"));
                else if (lower === "k") this.set("abcdefgh"[x] + y, new King(square === "K" ? "w" : "b"))
                else if (lower === "p") this.set("abcdefgh"[x] + y, new Pawn(square === "P" ? "w" : "b"));
                else if (!isNaN(Number(square))) x += Number(square) - 1;
                else console.log("[X] Error with the FEN : '" + fen.toString() + "' !");
                x++;
            });
            y--;
        });
    }

    /**
     * Generates an empty 8x8 board filled with null values.
     * 
     * @returns {Array<Array<null>>} 8x8 matrix initialized with null
     */
    static generateEmptyBoard() {
        return Array(8).fill(0).map(_ => Array(8).fill(null));
    }

    /**
     * Returns the square of the king for a given side.
     * 
     * @param {string} side 'w' or 'b'
     * @returns {string|null} Square in algebraic notation or null if not found
     */
    getKingSquare(side) {
        const squares = Board.getAllSquares();

        for(const square of squares) {
            const piece = this.get(square);
            if(piece instanceof King && piece.color === side) return square;
        }

        return null;
    }

    /**
     * Returns the piece located on a given square.
     * 
     * @param {string} square Algebraic square (e.g., "e4")
     * @returns {Piece|null} The piece on the square or null
     */
    get(square) {
        if (!this.constructor.isValidSquare(square)) return null;
        const indices = this.constructor.posToIndices(square);

        return this.board[indices[0]][indices[1]];
    }

    /**
     * Sets a piece on a given square.
     * 
     * @param {string} square Algebraic square
     * @param {Piece|null} piece Piece to place (or null to clear)
     * @returns {boolean} True if the operation succeeded
     */
    set(square, piece) {
        if (!this.constructor.isValidSquare(square)) return false;
        const indices = this.constructor.posToIndices(square);
        this.board[indices[0]][indices[1]] = piece;
        return true;
    }

    /**
     * Returns all pseudo-legal moves for a piece on a given square.
     * Pseudo-legal moves do not consider checks.
     * 
     * @param {string} square Starting square
     * @param {string} enPassant enPassant square
     * @returns {Array<Object>|null} List of move objects or null if no piece
     */
    getPseudoLegalMoves(square, enPassant) {
        const from = this.get(square);
        if (!from) return null;
        const moves = [];
        from.moves.forEach(move => {
            if (move.color && from.color !== move.color) return;
            let currentSquare = square;
            do {
                const finalSquare = Board.getFinalSquare(currentSquare, move);
                if (!Board.isValidSquare(finalSquare) || this.get(finalSquare)?.color === from.color) break;

                if ((from instanceof Pawn && from.color === 'w' && finalSquare[1] === '8') || (from instanceof Pawn && from.color === 'b' && finalSquare[1] === '1')) {
                    if (this.get(finalSquare)) break;
                    for(const piece of ['q', 'r', 'n', 'b']) {
                        moves.push({
                            from: square,
                            to: finalSquare,
                            promotion: from.isWhite() ? piece.toUpperCase() : piece,
                            action: Actions.MOVE | Actions.PROMOTION
                        });
                    }
                    break;
                }
                
                if (this.get(finalSquare) && this.get(finalSquare).color !== from.color) {
                    if (!from.eatMoves) moves.push({
                        from: square,
                        to: finalSquare,
                        action: Actions.MOVE | Actions.CAPTURE,
                        captured: this.get(finalSquare)
                    })
                    break;
                };
                
                moves.push({
                    from: square,
                    to: finalSquare,
                    action: Actions.MOVE
                });
                currentSquare = finalSquare;
            } while (move.repetition);
        });
        
        if (from instanceof Pawn) {
            if (square.includes("2") && from.isWhite() && !this.get(square[0] + '3') && !this.get(square[0] + '4')) {
                moves.push({
                    from: square,
                    to: square[0] + "4",
                    action: Actions.MOVE
                });
            } else if (square.includes("7") && from.isBlack() && !this.get(square[0] + '6') && !this.get(square[0] + '5')) {
                moves.push({
                    from: square,
                    to: square[0] + "5",
                    action: Actions.MOVE
                });
            }
        }
        from.eatMoves?.forEach(el => {
            if (el.color && from.color !== el.color) return;
            const finalSquare = Board.getFinalSquare(square, el);
            if (!Board.isValidSquare(finalSquare) || (!this.isOccupied(finalSquare) && finalSquare !== enPassant)) return;
            if (this.get(finalSquare) && this.get(finalSquare).color === from.color) return;

            if (from instanceof Pawn && (finalSquare[1] === '8' || finalSquare[1] === '1')) {
                for (const piece of ['q', 'r', 'n', 'b']) {
                    moves.push({
                        from: square,
                        to: finalSquare,
                        promotion: from.isWhite() ? piece.toUpperCase() : piece,
                        action: Actions.MOVE | Actions.CAPTURE | Actions.PROMOTION,
                        captured: this.get(finalSquare)
                    });
                }
            } else if (finalSquare === enPassant) {
                moves.push({
                    from: square,
                    to: finalSquare,
                    action: Actions.MOVE | Actions.EP_CAPTURE,
                });
            } else {
                moves.push({
                    from: square,
                    to: finalSquare,
                    action: Actions.MOVE | Actions.CAPTURE,
                    captured: this.get(finalSquare)
                });
            }

            
        });
        return moves;
    }

    /**
     * Returns all pseudo-legal moves for a given side.
     * 
     * @param {string} side 'w' or 'b'
     * @param {string} enPassant the current enPassantSquare
     * @returns {Array<Object>} List of pseudo-legal moves
     */
    getAllPseudoLegalMoves(side, enPassant) {
        const squares = Board.getAllSquares();
        const moves = [];
        for (const square of squares) {
            const piece = this.get(square);
            if (!piece || piece.color !== side) continue;
            moves.push(...this.getPseudoLegalMoves(square, enPassant));
        }

        return moves;
    }

    /**
     * Checks whether a square is controlled (attacked) by a given side.
     * 
     * @param {string} pos Target square
     * @param {string} side 'w' or 'b'
     * @returns {boolean} 'true' if the square is controlled
     */
    isControlled(pos, side) {
        return this.getAllPseudoLegalMoves(side).some(move => move.to === pos);
    }

    /**
     * Computes the resulting square after applying a move vector.
     * 
     * @param {string} initialSquare Starting square
     * @param {Object} move Move descriptor containing x and y offsets
     * @returns {string|null} Destination square or null if out of bounds
     */
    static getFinalSquare(initialSquare, move) {
        const file = initialSquare[0];
        const rank = Number(initialSquare[1]);

        const x = Board.fromColumnToIndex(file) + move.x;
        const y = (rank - 1) + move.y;

        if (x < 0 || x > 7 || y < 0 || y > 7) return null;

        return "abcdefgh"[x] + (y + 1);
    }


    /**
     * Converts a file letter (column) into its index (0–7).
     * Example: 'a' -> 0, 'h' -> 7
     * 
     * @param {string} column File letter
     * @returns {number} Column index or -1 if invalid
     */
    static fromColumnToIndex(column) {
        if (column?.length !== 1) return -1;
        switch (column) {
            case 'a':
                return 0;
            case 'b':
                return 1;
            case 'c':
                return 2;
            case 'd':
                return 3;
            case 'e':
                return 4;
            case 'f':
                return 5;
            case 'g':
                return 6;
            case 'h':
                return 7;
            default:
                return -1;
        }
    }

    /**
     * Checks whether a square is valid on the chessboard.
     * 
     * @param {string} square Algebraic square
     * @returns {boolean} True if valid
     */
    static isValidSquare(square) {
        if (square?.length !== 2) return false;

        return 'abcdefgh'.includes(square[0]) && '12345678'.includes(square[1]);
    }

    /**
     * Converts algebraic notation to board matrix indices.
     * 
     * @param {string} square Algebraic square
     * @returns {Array<number>} [rowIndex, colIndex]
     */
    static posToIndices(square) {
        const rowIndex = 8 - Number(square[1]);
        const colIndex = 'abcdefgh'.indexOf(square[0]);

        return [rowIndex, colIndex];
    }

    /**
     * Checks whether a square is occupied by a piece.
     * 
     * @param {string} square Algebraic square
     * @returns {boolean} True if a piece is present
     */
    isOccupied(square) {
        return Boolean(this.get(square));
    }

    /**
     * Converts the board into a human-readable string representation.
     * 
     * @returns {string} Board formatted as text
     */
    toString() {
        let i = 8;
        let str = "";
        this.board.forEach(row => {
            str += i + " ";
            i--;
            row.forEach(piece => {
                str += (piece === null ? "_" : piece.getSymbol()) + "|";
            })
            str = str.substring(0, str.length - 1) + "\n";
        });
        str += "  a b c d e f g h"
        return str;
    }

    /**
    * Creates a 2x15 array to store captured pieces.
    * 
    * @returns {Array<Array<null>>} 2x15 matrix initialized with null
    */
    static createEliminatedPiecesList() {
        return Array(2).fill(0).map(_ => Array(15).fill(null));
    }

    /**
     * Exports the board state as an object mapping squares to piece symbols.
     * 
     * @returns {Object} Key-value map of squares to piece symbols (or null)
     */
    export() {
        const squares = Board.getAllSquares();
        const pieces = {};

        const valueToSymbol = piece => piece
            ? (piece.color === 'w'
                ? piece.symbol.toUpperCase()
                : piece.symbol
            )
            : null;

        for(const square of squares) {
            pieces[square] = valueToSymbol(this.get(square));
        }

        return pieces;
    }

    /**
     * Returns all board squares in algebraic notation.
     * 
     * @returns {Array<string>} List of squares from a1 to h8
     */
    static getAllSquares() {
        const squares = [];
        const letters = 'abcdefgh';
        for (const letter of letters) {
            for (let i = 1; i < 9; i++) squares.push(letter + String(i));
        }

        return squares;
    }

    /**
     * export the board as a FEN (piece placement only)
     * 
     * @return {string} the FEN code
     */
    toFen() {
        let fen = "";
        let counter = 0
        for (let i = 0; i < this.board.length; i++) {
            for (let j = 0; j < this.board[i].length; j++) {
                if (this.board[i][j] === null) {
                    counter += 1;
                    if (j === this.board[i].length - 1) {
                        fen += (counter !== 0 ? counter : "");
                        counter = 0;
                    }
                } else {
                    fen += (counter !== 0 ? counter : "");
                    counter = 0;
                    fen += this.board[i][j].getSymbol();
                }
            }
            fen += (i !== this.board.length - 1 ? "/" : "");
        }
        return fen;
    }
}