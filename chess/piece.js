/**
 * This file defines the base Piece class and all classes that extend it.
 */

/**
 * Base class representing a chess piece.
 * 
 * Each piece has:
 * - a color ('w' for white, 'b' for black),
 * - a material value (used for position evaluation),
 * - a movement pattern used to generate pseudo-legal moves,
 * - an optional separate capture pattern (used mainly for pawns),
 * - a display symbol.
 * 
 * A move pattern is defined as a list of displacement objects:
 * - x: horizontal displacement (file)
 * - y: vertical displacement (rank)
 * - repetition: whether the displacement can be repeated multiple times
 */
export class Piece {

    /**
     * Constructor.
     * 
     * @param {string} color Piece color ('w' or 'b')
     * @param {Array<Object>} moves Movement pattern
     * @param {number} value Material value of the piece
     * @param {Array<Object>|null} eatMoves Capture movement pattern (if different from moves)
     * @param {string} symbol Lowercase character representing the piece
     */
    constructor(color, moves, value, eatMoves, symbol) {
        this.color = color;
        this.moves = moves;
        this.eatMoves = eatMoves ?? null
        this.value = value;
        this.symbol = symbol
    }

    /**
     * Checks whether the piece is white.
     * 
     * @returns {boolean} True if the piece is white
     */
    isWhite() {
        return this.color === "w";
    }

    /**
     * Checks whether the piece is black.
     * 
     * @returns {boolean} True if the piece is black
     */
    isBlack() {
        return !this.isWhite();
    }

    /**
     * Returns the material value of the piece.
     * 
     * @returns {number} Piece value
     */
    getValue() {
        return this.value;
    }

    /**
     * Returns the display symbol of the piece.
     * Uppercase for white, lowercase for black.
     * 
     * @returns {string} Piece symbol
     */
    getSymbol() {
        return this.isWhite() ? this.symbol.toUpperCase() : this.symbol.toLowerCase();
    }
}

/**
 * Represents a Bishop.
 * Moves diagonally any number of squares.
 */
export class Bishop extends Piece {
    constructor(color) {
        super(color, [
            { x:  1,  y:  1, repetition: true },
            { x: -1,  y:  1, repetition: true },
            { x:  1,  y: -1, repetition: true },
            { x: -1,  y: -1, repetition: true }
        ], 3, null, 'b');
    }
}

/**
 * Represents a Rook.
 * Moves horizontally or vertically any number of squares.
 */
export class Rook extends Piece {
    constructor(color) {
        super(color, [
        { x:  1,  y:  0, repetition: true },
        { x: -1,  y:  0, repetition: true },
        { x:  0,  y: 1, repetition: true },
        { x: 0,  y: -1, repetition: true } 
        ], 5, null, 'r')
    }
}

/**
 * Represents a Knight.
 * Moves in an L-shape and can jump over pieces.
 */
export class Knight extends Piece {
    constructor(color) {
        super(color, [
        { x:  2,  y:  1, repetition: false },
        { x:  2,  y: -1, repetition: false },
        { x:  -2,  y:  1, repetition: false },
        { x:  -2,  y: -1, repetition: false },
        { x:  1,  y: -2, repetition: false },
        { x:  1,  y: 2, repetition: false },
        { x:  -1,  y: -2, repetition: false },
        { x:  -1,  y: 2, repetition: false },
        ], 3, null, 'n')
    }
}

/**
 * Represents a Queen.
 * Combines the movement of a Rook and a Bishop.
 */
export class Queen extends Piece {
    constructor(color) {
        super(color, [
        { x:  1,  y:  1, repetition: true },
        { x: -1,  y:  1, repetition: true },
        { x:  1,  y: -1, repetition: true },
        { x: -1,  y: -1, repetition: true },
        { x:  1,  y:  0, repetition: true },
        { x: -1,  y:  0, repetition: true },
        { x:  0,  y: 1, repetition: true },
        { x: 0,  y: -1, repetition: true } 
        ], 9, null, 'q')
    }
}


/**
 * Represents a King.
 * Moves one square in any direction.
 */
export class King extends Piece {
    constructor(color) {
        super(color, [
        { x:  1,  y:  1, repetition: false },
        { x: -1,  y:  1, repetition: false },
        { x:  1,  y: -1, repetition: false },
        { x: -1,  y: -1, repetition: false },
        { x:  1,  y:  0, repetition: false },
        { x: -1,  y:  0, repetition: false },
        { x:  0,  y:  1, repetition: false },
        { x:  0,  y: -1, repetition: false } 
        ], -1, null, 'k')
    }
}

/**
 * Represents a Pawn.
 * 
 * Pawns have:
 * - Forward movement (non-capturing)
 * - Diagonal capture movement
 * 
 * The direction depends on the piece color.
 */
export class Pawn extends Piece {
    constructor(color) {
        super(
            color,
            [
                { x: 0, y: 1, repetition: false, color: 'w' },
                { x: 0, y: -1, repetition: false, color: 'b' }, 
            ],
            1,
            [
                { x: 1,  y: 1, repetition: false, color: 'w' },
                { x: -1, y: 1, repetition: false, color: 'w' },
                { x: 1, y: -1, repetition: false, color: 'b' },
                { x: -1, y: -1, repetition: false, color: 'b' },
            ], 'p')
    }
}