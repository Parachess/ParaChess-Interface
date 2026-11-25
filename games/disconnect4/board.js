/**
 * This file contains the Board class implementation
 */
export default class Board {
  /**
   * Constructor.
   */
  constructor() {
    this.board = this.constructor.generateEmptyBoard();
  }

  /**
   * insert a pawn into a boards' column
   *
   * @param {int} column the column to insert the pawn
   * @param {str} side the side
   * @return {bool} true if the insertion is good, false otherwise
   */
  insert(column, side) {
    if (!this.constructor.isValid(column)) return false;
    if (!["r", "b"].includes(side)) return false;
    let iMax = 0;
    let columnIndex = column - 1;
    for (let i = 0; i < 6; i++) {
      if (i == 0 && this.board[i][columnIndex] !== null) return false;
      else if (this.board[i][columnIndex] != null) break;
      else iMax = i;
    }
    this.board[iMax][columnIndex] = side;
    return true;
  }

  /**
   * removes a pawn from the board
   *
   * @param {int} column the column
   */
  remove(column) {
    let columnIndex = column - 1;
    for (let i = 0; i < 6; i++) {
      if (this.board[i][columnIndex] !== null) {
        this.board[i][columnIndex] = null;
        return;
      }
    }
  }

  /**
   * get all the non-full columns
   *
   * @return {Array<int>} the non-full columns
   */
  getLegalColumns() {
    const columns = [];
    for (let i = 0; i < 7; i++) {
      if (this.board[0][i] === null) columns.push(i + 1);
    }
    return columns;
  }

  /**
   * Converts the board into a string
   *
   * @return {str} the string
   */
  toString() {
    let str = "\n";
    for (let i = 0; i < 6; i++) {
      str += "|";
      for (let j = 0; j < 7; j++) {
        str +=
          this.board[i][j] === null
            ? "   |"
            : this.board[i][j] === "r"
              ? " R |"
              : " B |";
      }
      str += "\n";
    }
    str += "  1   2   3   4   5   6   7\n";
    return str;
  }

  /**
   * Check if a column is valid
   *
   * @param {int} column the column to be tested
   */
  static isValid(column) {
    return column >= 1 && column <= 7;
  }

  isWin(side) {
    if (!["r", "b"].includes(side)) return false;
    const directions = [
      [0, 1],
      [1, 0],
      [1, 1],
      [-1, 1],
    ];
    for (let line = 0; line < 6; line++) {
      for (let column = 0; column < 7; column++) {
        if (this.board[line][column] !== side) continue;
        for (let direction = 0; direction < directions.length; direction++) {
          let currentLine = line;
          let currentColumn = column;
          let aligned4 = true;
          for (let i = 0; i < 3; i++) {
            currentLine += directions[direction][0];
            currentColumn += directions[direction][1];
            if (
              this.board[currentLine] === undefined ||
              this.board[currentLine][currentColumn] !== side
            ) {
              aligned4 = false;
              break;
            }
          }
          if (aligned4) return true;
        }
      }
    }
    return false;
  }

  /**
   * Checks wether the board is full
   *
   * @return {bool} true if the board is full, false otherwise
   */
  isFull() {
    for (let i = 0; i < 7; i++) {
      if (this.board[0][i] === null) return false;
    }
    return true;
  }

  /**
   * export the board into a 6x7 Matrix
   *
   * @returns {Array<Array<str>>} a 6x7 Matrix
   */
  export() {
    return JSON.parse(JSON.stringify(this.board));
  }

  /**
   * Generate an empty 6x7 array filled with null values
   *
   * @returns {Array<Array<null>>} 6x7 matrix filled with null
   */
  static generateEmptyBoard() {
    return Array(6)
      .fill(0)
      .map((_) => Array(7).fill(null));
  }
}
