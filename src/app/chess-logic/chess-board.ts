import { CheckState, Color, Coordinates, FENChar, LastMove, SafeSquares } from "./models";

import { Rook } from "./pieces/rook";
import { Knight } from "./pieces/knight";
import { Bishop } from "./pieces/bishop";
import { King } from "./pieces/king";
import { Queen } from "./pieces/queen";
import { Pawn } from "./pieces/pawn";

import { Piece } from "./pieces/piece";

import { FENConverter } from "./FENConverter";

export class ChessBoard {
  private chessBoard: (Piece | null)[][];
  private _safeSquares: SafeSquares;
  private readonly boardSize: number = 8;
  private _playerColor = Color.WHITE;
  private _lastMove: LastMove | undefined;
  private _checkState: CheckState = { isInCheck: false };
  private fiftyMoveRuleCounter: number = 0;

  private _isGameOver: boolean = false;
  private _isGameOverMessage: string | undefined;

  private fullMoveNumber: number = 1;
  private threeFoldRepetitionDict = new Map<string, number>();
  private threeFoldRepetitionFlag: boolean = false;

  private _boardAsFEN: string = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  private FENConverter = new FENConverter();

  constructor() {
    this.chessBoard = [
      [
        new Rook(Color.WHITE),
        new Knight(Color.WHITE),
        new Bishop(Color.WHITE),
        new Queen(Color.WHITE),
        new King(Color.WHITE),
        new Bishop(Color.WHITE),
        new Knight(Color.WHITE),
        new Rook(Color.WHITE),
      ],
      [
        new Pawn(Color.WHITE),
        new Pawn(Color.WHITE),
        new Pawn(Color.WHITE),
        new Pawn(Color.WHITE),
        new Pawn(Color.WHITE),
        new Pawn(Color.WHITE),
        new Pawn(Color.WHITE),
        new Pawn(Color.WHITE),
      ],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [
        new Pawn(Color.BLACK),
        new Pawn(Color.BLACK),
        new Pawn(Color.BLACK),
        new Pawn(Color.BLACK),
        new Pawn(Color.BLACK),
        new Pawn(Color.BLACK),
        new Pawn(Color.BLACK),
        new Pawn(Color.BLACK),
      ],
      [
        new Rook(Color.BLACK),
        new Knight(Color.BLACK),
        new Bishop(Color.BLACK),
        new Queen(Color.BLACK),
        new King(Color.BLACK),
        new Bishop(Color.BLACK),
        new Knight(Color.BLACK),
        new Rook(Color.BLACK),
      ],
    ];
    this._safeSquares = this.findSafeSquares();
  }

  public get playerColor(): Color {
    return this._playerColor;
  }

  public get chessBoardView(): (FENChar | null)[][] {
    return this.chessBoard.map((row) => {
      return row.map((piece) => (piece instanceof Piece ? piece.FENChar : null));
    });
  }

  public get safeSquares(): SafeSquares {
    return this._safeSquares;
  }

  public get lastMove(): LastMove | undefined {
    return this._lastMove;
  }

  public get checkState(): CheckState {
    return this._checkState;
  }

  public isGameOver(): boolean {
    return this._isGameOver;
  }

  public get gameOverMessage(): string | undefined {
    return this._isGameOverMessage;
  }

  public get boardAsFEN(): string {
    return this._boardAsFEN;
  }

  public static isSquareDark(x: number, y: number): boolean {
    return (x % 2 === 0 && y % 2 === 0) || (x % 2 === 1 && y % 2 === 1);
  }

  private areCoordinatesValid(x: number, y: number): boolean {
    return x >= 0 && x < this.boardSize && y >= 0 && y < this.boardSize;
  }

  public isInCheck(_color: Color, checkingCurrentPosition: boolean): boolean {
    for (let x = 0; x < this.boardSize; x++) {
      for (let y = 0; y < this.boardSize; y++) {
        const piece: Piece | null = this.chessBoard[x][y];

        if (!piece || piece.color === _color) continue;

        for (const { x: dx, y: dy } of piece.directions) {
          let targetX: number = x + dx;
          let targetY: number = y + dy;

          if (!this.areCoordinatesValid(targetX, targetY)) continue;

          if (piece instanceof Pawn || piece instanceof Knight || piece instanceof King) {
            //Pawns are only attacking diagonally
            if (piece instanceof Pawn && dy === 0) continue;

            const targetPiece: Piece | null = this.chessBoard[targetX][targetY];
            if (targetPiece instanceof King && targetPiece.color === _color) {
              if (checkingCurrentPosition)
                this._checkState = {
                  isInCheck: true,
                  x: targetX,
                  y: targetY,
                };
              return true;
            }
          } else {
            while (this.areCoordinatesValid(targetX, targetY)) {
              const targetPiece: Piece | null = this.chessBoard[targetX][targetY];
              if (targetPiece instanceof King && targetPiece.color === _color) {
                if (checkingCurrentPosition)
                  this._checkState = {
                    isInCheck: true,
                    x: targetX,
                    y: targetY,
                  };
                return true;
              }

              if (targetPiece !== null) break;

              targetX += dx;
              targetY += dy;
            }
          }
        }
      }
    }
    if (checkingCurrentPosition) this._checkState = { isInCheck: false };
    return false;
  }

  private isPositionSafeAfterMove(x: number, y: number, dx: number, dy: number): boolean {
    const piece: Piece | null = this.chessBoard[x][y];
    if (!piece) return false;
    // x,y => previous coordinates  dx,dy => new coordinates
    const targetPiece: Piece | null = this.chessBoard[dx][dy];
    // Check if the new position is occupied by a friendly piece
    if (targetPiece && targetPiece.color === piece.color) return false;

    //simulate position
    this.chessBoard[x][y] = null;
    this.chessBoard[dx][dy] = piece;

    const isPositionSafe = !this.isInCheck(piece.color, false);

    //restore position
    this.chessBoard[x][y] = piece;
    this.chessBoard[dx][dy] = targetPiece;

    return isPositionSafe;
  }

  private findSafeSquares(): SafeSquares {
    const safeSquares: SafeSquares = new Map<string, Coordinates[]>();

    for (let x = 0; x < this.boardSize; x++) {
      for (let y = 0; y < this.boardSize; y++) {
        const piece: Piece | null = this.chessBoard[x][y];

        if (!piece || piece.color !== this._playerColor) continue;

        const safeSquaresList: Coordinates[] = [];

        for (const { x: dx, y: dy } of piece.directions) {
          let targetX: number = x + dx;
          let targetY: number = y + dy;

          if (!this.areCoordinatesValid(targetX, targetY)) continue;

          let targetPiece: Piece | null = this.chessBoard[targetX][targetY];
          if (targetPiece && targetPiece.color === piece.color) continue;

          // need to restrict move in certain directions
          if (piece instanceof Pawn) {
            //Pawns cannot move 2 squares forward if any piece is in the way
            if (dx === 2 || dx === -2) {
              if (targetPiece) continue;
              if (this.chessBoard[targetX + (dx === 2 ? -1 : 1)][targetY]) continue;
            }
            //Pawns cannot move 1 square forward if any piece is in the way
            if ((dx === 1 || dx === -1) && dy === 0 && targetPiece) continue;

            //Pawns cannot diagonally if there is no piece ,or has same color
            if ((dy === 1 || dy === -1) && (!targetPiece || targetPiece.color === piece.color)) continue;
          }

          if (piece instanceof Pawn || piece instanceof Knight || piece instanceof King) {
            if (this.isPositionSafeAfterMove(x, y, targetX, targetY)) {
              safeSquaresList.push({ x: targetX, y: targetY });
            }
          } else {
            while (this.areCoordinatesValid(targetX, targetY)) {
              targetPiece = this.chessBoard[targetX][targetY];
              if (targetPiece && targetPiece.color === piece.color) break;

              if (this.isPositionSafeAfterMove(x, y, targetX, targetY)) {
                safeSquaresList.push({ x: targetX, y: targetY });
              }

              if (targetPiece !== null) break;

              targetX += dx;
              targetY += dy;
            }
          }
        }

        if (piece instanceof King) {
          if (this.canCastle(piece, true))
            // O_O => King Side Castle
            safeSquaresList.push({ x, y: 6 });

          if (this.canCastle(piece, false))
            // O_O_O => Queen Side Castle
            safeSquaresList.push({ x, y: 2 });
        } else if (piece instanceof Pawn && this.canCaptureEnPassant(piece, x, y))
          safeSquaresList.push({
            x: x + (piece.color === Color.WHITE ? 1 : -1),
            y: this._lastMove!.prevY,
          });
        if (safeSquaresList.length > 0) {
          safeSquares.set(`${x}-${y}`, safeSquaresList);
        }
      }
    }
    return safeSquares;
  }

  private canCaptureEnPassant(pawn: Pawn, rank: number, file: number): boolean {
    if (!this._lastMove) return false;
    const { piece, currX: currRank, prevX: prevRank, currY: currFile } = this._lastMove;

    if (
      !(piece instanceof Pawn) ||
      pawn.color !== this._playerColor ||
      Math.abs(currRank - prevRank) !== 2 ||
      Math.abs(file - currFile) !== 1 ||
      rank !== currRank
    )
      return false;

    const targetRank: number = rank + (pawn.color === Color.WHITE ? 1 : -1);
    const targetFile: number = currRank;

    this.chessBoard[currRank][currFile] = null;
    const isPositionSafe: boolean = this.isPositionSafeAfterMove(rank, file, targetRank, targetFile);
    this.chessBoard[currRank][currFile] = piece;

    return isPositionSafe;
  }

  private canCastle(king: King, isKingSide: boolean): boolean {
    if (king.hasMoved) return false;

    const rank: number = king.color === Color.WHITE ? 0 : 7;
    const kingFile: number = 4;

    const rookFile: number = isKingSide ? 7 : 0;
    const rook: Piece | null = this.chessBoard[rank][rookFile];

    if (!(rook instanceof Rook) || rook.hasMoved || this._checkState.isInCheck) return false;

    const firstStepFile: number = kingFile + (isKingSide ? 1 : -1);
    const secondStepFile: number = kingFile + (isKingSide ? 2 : -2);

    if (this.chessBoard[rank][firstStepFile] || this.chessBoard[rank][secondStepFile]) return false;
    if (!isKingSide && this.chessBoard[rank][1]) return false;

    return (
      this.isPositionSafeAfterMove(rank, kingFile, rank, firstStepFile) &&
      this.isPositionSafeAfterMove(rank, kingFile, rank, secondStepFile)
    );
  }

  public move(x: number, y: number, dx: number, dy: number, promotedPieceType: FENChar | null): void {
    if (this._isGameOver) throw new Error("Game is over, you cannot play move");
    if (!this.areCoordinatesValid(x, y) || !this.areCoordinatesValid(dx, dy)) return;
    const piece: Piece | null = this.chessBoard[x][y];
    if (!piece || piece.color !== this._playerColor) return;

    const safeSquaresList: Coordinates[] | undefined = this._safeSquares.get(x + "-" + y);
    if (!safeSquaresList || !safeSquaresList.find((coordinates) => coordinates.x === dx && coordinates.y === dy))
      throw new Error("Square is not safe");

    if ((piece instanceof Pawn || piece instanceof King || piece instanceof Rook) && !piece.hasMoved)
      piece.hasMoved = true;

    const isPieceCaptured: boolean = this.chessBoard[dx][dy] !== null;
    if (piece instanceof Pawn || isPieceCaptured) this.fiftyMoveRuleCounter = 0;
    else this.fiftyMoveRuleCounter += 0.5;

    this.handleSpecialMoves(piece, x, y, dx, dy);
    //update the board
    if (promotedPieceType) {
      this.chessBoard[dx][dy] = this.promotedPiece(promotedPieceType);
    } else {
      this.chessBoard[dx][dy] = piece;
    }
    this.chessBoard[x][y] = null;

    this._lastMove = { prevX: x, prevY: y, currX: dx, currY: dy, piece };
    this._playerColor = this._playerColor === Color.WHITE ? Color.BLACK : Color.WHITE;
    this.isInCheck(this._playerColor, true);
    this._safeSquares = this.findSafeSquares();

    if (this.playerColor === Color.WHITE) this.fullMoveNumber++;
    this._boardAsFEN = this.FENConverter.convertBoardToFEN(
      this.chessBoard,
      this._playerColor,
      this._lastMove,
      this.fiftyMoveRuleCounter,
      this.fullMoveNumber
    );
    this.updateThreeFoldRepetitionDict(this._boardAsFEN);

    this._isGameOver = this.isGameFinished();
  }

  private handleSpecialMoves(piece: Piece, rank: number, file: number, _dx: number, dy: number): void {
    if (piece instanceof King && Math.abs(dy - file) === 2) {
      // Castling detected (king moves two squares horizontally)
      const rookFile: number = dy > file ? 7 : 0; // Kingside or Queenside
      const rook = this.chessBoard[rank][rookFile] as Rook;

      const rookNewFile: number = dy > file ? 5 : 3; // Rook moves next to king
      this.chessBoard[rank][rookFile] = null;
      this.chessBoard[rank][rookNewFile] = rook;

      rook.hasMoved = true;
    } else if (
      piece instanceof Pawn &&
      this._lastMove &&
      this._lastMove.piece instanceof Pawn &&
      Math.abs(this._lastMove.currX - this._lastMove.prevX) === 2 &&
      rank === this._lastMove.currX &&
      dy === this._lastMove.currY
    ) {
      this.chessBoard[this._lastMove.currX][this._lastMove.currY] = null;
    }
  }

  private promotedPiece(pieceType: FENChar): Knight | Bishop | Rook | Queen {
    if (pieceType === FENChar.WhiteKnight || pieceType === FENChar.BlackKnight) return new Knight(this._playerColor);

    if (pieceType === FENChar.WhiteBishop || pieceType === FENChar.BlackBishop) return new Bishop(this._playerColor);

    if (pieceType === FENChar.WhiteRook || pieceType === FENChar.BlackRook) return new Rook(this._playerColor);

    return new Queen(this._playerColor);
  }

  private isGameFinished(): boolean {
    if (this.insufficientMaterial()) {
      this._isGameOverMessage = "Draw by insufficient material";
      return true;
    }
    if (!this._safeSquares.size) {
      if (this._checkState.isInCheck) {
        const prevPlayer: string = this.playerColor === Color.WHITE ? "Black" : "White";
        this._isGameOverMessage = `${prevPlayer} won by checkmate`;
      } else this._isGameOverMessage = "Draw by stalemate";
      return true;
    }

    if (this.threeFoldRepetitionFlag) {
      this._isGameOverMessage = "Draw by threefold repetition";
      return true;
    }

    if (this.fiftyMoveRuleCounter === 50) {
      this._isGameOverMessage = "Draw by fifty move rule";
      return true;
    }
    return false;
  }

  //Insuficient material
  private playerHasOnlyTwoKnightsAndKing(pieces: { piece: Piece; x: number; y: number }[]): boolean {
    return pieces.length === 3 && pieces.filter(({ piece }) => piece instanceof Knight).length === 2;
  }

  private playerHasOnlyBishopsWithSameColorAndKing(pieces: { piece: Piece; x: number; y: number }[]): boolean {
    const bishops = pieces.filter(({ piece }) => piece instanceof Bishop);
    if (bishops.length !== pieces.length - 1) return false; // Ensure only one non-bishop piece (the king)

    const areAllBishopsSameColor = new Set(bishops.map(({ x, y }) => ChessBoard.isSquareDark(x, y))).size === 1;
    return areAllBishopsSameColor;
  }

  private insufficientMaterial(): boolean {
    const whitePieces: { piece: Piece; x: number; y: number }[] = [];
    const blackPieces: { piece: Piece; x: number; y: number }[] = [];

    for (let x = 0; x < this.boardSize; x++) {
      for (let y = 0; y < this.boardSize; y++) {
        const piece: Piece | null = this.chessBoard[x][y];
        if (!piece) continue;

        (piece.color === Color.WHITE ? whitePieces : blackPieces).push({ piece, x, y });
      }
    }

    const totalWhite = whitePieces.length;
    const totalBlack = blackPieces.length;

    // King vs King
    if (totalWhite === 1 && totalBlack === 1) return true;

    // King and minor piece vs King
    if (totalWhite === 2 && totalBlack === 1)
      return whitePieces.some(({ piece }) => piece instanceof Knight || piece instanceof Bishop);
    if (totalWhite === 1 && totalBlack === 2)
      return blackPieces.some(({ piece }) => piece instanceof Knight || piece instanceof Bishop);

    // Two knights (same side) vs King
    if (totalWhite === 3 && totalBlack === 1 && this.playerHasOnlyTwoKnightsAndKing(whitePieces)) return true;
    if (totalBlack === 3 && totalWhite === 1 && this.playerHasOnlyTwoKnightsAndKing(blackPieces)) return true;

    // Only bishops of the same color and kings
    if (totalWhite >= 3 && totalBlack === 1 && this.playerHasOnlyBishopsWithSameColorAndKing(whitePieces)) return true;
    if (totalBlack >= 3 && totalWhite === 1 && this.playerHasOnlyBishopsWithSameColorAndKing(blackPieces)) return true;

    // Each side has exactly one bishop, and they're on the same color
    if (totalWhite === 2 && totalBlack === 2) {
      const whiteBishop = whitePieces.find(({ piece }) => piece instanceof Bishop);
      const blackBishop = blackPieces.find(({ piece }) => piece instanceof Bishop);

      if (whiteBishop && blackBishop) {
        return (
          ChessBoard.isSquareDark(whiteBishop.x, whiteBishop.y) ===
          ChessBoard.isSquareDark(blackBishop.x, blackBishop.y)
        );
      }
    }

    return false;
  }

  private updateThreeFoldRepetitionDict(FEN: string): void {
    const threeFoldRepetitionFENKey: string = FEN.split(" ").slice(0, 4).join("");
    const threeFoldRepetitionValue: number | undefined = this.threeFoldRepetitionDict.get(threeFoldRepetitionFENKey);

    if (threeFoldRepetitionValue === undefined) this.threeFoldRepetitionDict.set(threeFoldRepetitionFENKey, 1);
    else {
      if (threeFoldRepetitionValue === 2) {
        this.threeFoldRepetitionFlag = true;
        return;
      }
      this.threeFoldRepetitionDict.set(threeFoldRepetitionFENKey, 2);
    }
  }
}
