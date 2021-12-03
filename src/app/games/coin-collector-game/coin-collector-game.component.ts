import {
  Component,
  ElementRef,
  NgZone,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { Speed } from 'src/app/_models/games/coin-collector-game';
import {
  CoinCollectorGameEngineService,
} from 'src/app/_services/games/coin-collector-game-engine.service';
import { SpiromagicService } from 'src/app/_services/spiromagic.service';

@Component({
  selector: 'app-coin-collector-game',
  templateUrl: './coin-collector-game.component.html',
  styleUrls: ['./coin-collector-game.component.scss']
})
export class CoinCollectorGameComponent implements OnInit {

  @ViewChild('rendererCanvas', { static: true })
  public rendererCanvas: ElementRef<HTMLCanvasElement> | undefined;
  public coinsCollected = 0;
  public speed = Speed;

  private subscriptions: Subscription[] = [];

  constructor(
    private gameEngine: CoinCollectorGameEngineService,
    private zone: NgZone,
    private spiromagicService: SpiromagicService,
    private toastrService: ToastrService
  ) { }

  ngOnInit(): void {
    this.gameEngine.createScene(this.rendererCanvas);
    this.gameEngine.animate();
    this.getReadings();
    this.toastrService.info(` In this application you will perform the pursed lip breathing exercise like you did in the tutorial.
                              When you exhale, the plane will fly upwards and slowly fly back down when you inhale.
                              Collect as many coins as you can! You can increase and decrease the speed in the menu in the upper left corner.`, `Controls`, {
      disableTimeOut: true,
      closeButton: true,
      positionClass: 'toast-bottom-left'
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(e => e?.unsubscribe());
    this.gameEngine.stopGame();
    this.toastrService.clear();
  }

  getReadings(): void {
    // this.spiromagicService.calibration$.next(new ConstantStepperCalibration());
    this.subscriptions.push(this.spiromagicService.reading$.subscribe(reading => {
      this.gameEngine.setCharacterPosition(reading);
    }));
    this.subscriptions.push(this.gameEngine.coinsCollected$.subscribe(coinsCollected => {
      this.zone.run(() => this.coinsCollected = coinsCollected);
    }));
  }

  resetGame(): void {
    // this.gameEngine.resetGame();
  }

  setGameSpeed(value: number): void {
    this.speed = value;
    this.gameEngine.gameSpeed = value;
  }
}
