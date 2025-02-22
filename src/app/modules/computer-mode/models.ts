import { FENChar } from "../../chess-logic/models";

export type StockFishQueryParams = {
  FEN: string;
  depth: number;
  mode: string;
};

export type ChessMove = {
  prevX: number;
  prevY: number;
  newX: number;
  newY: number;
  promotionPiece: FENChar | null;
};

export type StockFishResponse = {
  success: boolean;
  data: string;
};
