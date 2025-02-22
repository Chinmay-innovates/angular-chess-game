import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, of, switchMap } from "rxjs";
import { ChessMove, StockFishQueryParams, StockFishResponse } from "./models";
import { FENChar } from "src/app/chess-logic/models";

@Injectable({
  providedIn: "root",
})
export class StockfishService {
  private readonly api: string = "https://stockfish.online/api/stockfish.php";

  constructor(private http: HttpClient) {}
  private convertColumnLetterToYCoordinate(string: string): number {
    return string.charCodeAt(0) - "a".charCodeAt(0);
  }

  private promotedPiece(piece: string): FENChar | null {
    if (!piece) return null;

    switch (piece.toLowerCase()) {
      case "n":
        return FENChar.BlackKnight;
      case "b":
        return FENChar.BlackBishop;
      case "r":
        return FENChar.BlackRook;
      case "q":
        return FENChar.BlackQueen;
      default:
        return null;
    }
  }

  private moveFromStockFishString(moveString: string): ChessMove {
    const prevY: number = this.convertColumnLetterToYCoordinate(moveString[0]);
    const prevX: number = Number(moveString[1]) - 1;
    const newY: number = this.convertColumnLetterToYCoordinate(moveString[2]);
    const newX: number = Number(moveString[3]) - 1;
    const promotionPiece = this.promotedPiece(moveString[4]);

    return { prevX, prevY, newX, newY, promotionPiece };
  }

  public getBestMove(fen: string): Observable<ChessMove> {
    const queryParams: StockFishQueryParams = { FEN: fen, depth: 13, mode: "bestmove" };

    const params = new HttpParams().appendAll(queryParams);

    return this.http.get<StockFishResponse>(this.api, { params }).pipe(
      switchMap((response) => {
        console.log(response);
        if (!response.data) {
          throw new Error("Invalid response: data is undefined");
        }
        const bestMove: string = response.data.split(" ")[1];
        return of(this.moveFromStockFishString(bestMove));
      })
    );
  }
}
