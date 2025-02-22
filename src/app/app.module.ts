import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import {HttpClientModule} from '@angular/common/http';
import { ChessBoardComponent } from './modules/chess-board/chess-board.component';
import { ComputerModeComponent } from './modules/computer-mode/computer-mode.component';
import { NavMenuComponent } from './modules/nav-menu/nav-menu.component';

@NgModule({
  declarations: [
    AppComponent,
    ChessBoardComponent,
    ComputerModeComponent,
    NavMenuComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
