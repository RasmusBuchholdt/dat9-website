import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';

import {
  CalibrationStrategy,
} from '../_models/calibration/calibration-strategy';
import {
  DynamicStepperCalibration,
} from '../_models/calibration/dynamic-stepper-calibration';
import { CalibrationService } from './calibration.service';
import { GATTCharacteristicService } from './gatt-characteristic.service';

@Injectable({
  providedIn: 'root'
})
export class SpiromagicService implements OnDestroy {

  tutorialFinished$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  calibrationProgress$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  reading$: BehaviorSubject<number | null> = new BehaviorSubject<number | null>(null);
  calibration$: BehaviorSubject<CalibrationStrategy | null> = new BehaviorSubject<CalibrationStrategy | null>(this.calibrationService.calibrations[0]);
  sensitivity$: BehaviorSubject<number | null> = new BehaviorSubject<number | null>(0);

  private minReading = Number.MAX_SAFE_INTEGER;
  private maxReading = Number.MIN_SAFE_INTEGER;

  private subscription: Subscription | null = null;

  private TUTORIAL_KEY = 'TUTORIAL_FINISHED';

  constructor(
    private zone: NgZone,
    private gattService: GATTCharacteristicService,
    private calibrationService: CalibrationService
  ) {
    this.getTutorialStatus();
    // Default values
    this.calibration$.next(new DynamicStepperCalibration());
    this.sensitivity$.next(15);
    this.subscription = this.gattService
      .stream(
        '73ab1200-a251-4c85-0f8c-d8db000021df',
        '73ab1201-a251-4c85-0f8c-d8db000021df',
        [
          { name: 'SPIRO/MAGIC' },
          { services: ['73ab1200-a251-4c85-0f8c-d8db000021df'] }
        ])
      .subscribe(reading => {
        this.handleReading(reading);
      });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  connect(): void {
    this.getSpirometerReadings();
  }

  disconnect(): void {
    this.gattService.disconnectDevice();
  }

  completeReset(): void {
    this.resetReadings();
    this.calibration$.getValue().reset();
  }

  resetReadings(): void {
    this.minReading = Number.MAX_SAFE_INTEGER;
    this.maxReading = Number.MIN_SAFE_INTEGER;
  }

  setTutorialCompleted(state: boolean): void {
    localStorage.setItem(this.TUTORIAL_KEY, JSON.stringify(state));
    this.tutorialFinished$.next(state);
  }

  private getTutorialStatus(): void {
    const content = localStorage.getItem(this.TUTORIAL_KEY);
    this.tutorialFinished$.next(content !== null ? JSON.parse(content) as boolean : false);
  }

  private getSpirometerReadings() {
    return this.gattService.value().subscribe(this.handleReading.bind(this));
  }

  private handleReading(reading: DataView) {
    this.zone.run(() => {
      this.reading$.next(this.convertReading(reading));
    });
  }

  private convertReading(reading: DataView): number {
    const rawReading = reading.getInt32(1, true);
    const calibration = this.calibration$.getValue();
    const sensitivity = this.sensitivity$.getValue();

    if (rawReading < this.minReading)
      this.minReading = rawReading;
    if (rawReading > this.maxReading)
      this.maxReading = rawReading;

    if (this.calibrationProgress$.getValue() !== 100)
      this.calibrationProgress$.next(calibration.progression);

    return +calibration.calibrate(rawReading, this.minReading, this.maxReading, sensitivity).toFixed(2);
  }

  get device(): Observable<BluetoothDevice> {
    return this.gattService.device;
  }

  get isConnected(): boolean {
    return this.gattService.isConnected;
  }
}
