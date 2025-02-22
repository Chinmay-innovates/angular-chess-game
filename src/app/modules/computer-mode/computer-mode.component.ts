import { Component } from "@angular/core";
import { ChessBoardComponent } from "../chess-board/chess-board.component";

@Component({
  selector: "app-computer-mode",
  templateUrl: "../chess-board/chess-board.component.html",
  styleUrls: ["../chess-board/chess-board.component.css"],
})
export class ComputerModeComponent extends ChessBoardComponent {}
