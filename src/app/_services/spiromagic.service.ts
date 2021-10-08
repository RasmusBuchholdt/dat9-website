import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';

import {
  CalibrationStrategy,
} from '../_models/calibration/calibration-strategy';
import { CalibrationService } from './calibration.service';
import { GATTCharacteristicService } from './gatt-characteristic.service';

@Injectable({
  providedIn: 'root'
})
export class SpiromagicService implements OnDestroy {

  connected = false;
  reading$: BehaviorSubject<number | null> = new BehaviorSubject<number | null>(null);
  calibration$: BehaviorSubject<CalibrationStrategy | null> = new BehaviorSubject<CalibrationStrategy | null>(this.calibrationService.calibrations[0]);
  sensitivity$: BehaviorSubject<number | null> = new BehaviorSubject<number | null>(0);

  private minReading = Number.MAX_SAFE_INTEGER;
  private maxReading = Number.MIN_SAFE_INTEGER;

  private subscription: Subscription | null = null;

  constructor(
    private zone: NgZone,
    private gattService: GATTCharacteristicService,
    private calibrationService: CalibrationService
  ) {
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
    this.connected = false;
    this.gattService.disconnectDevice();
  }

  resetReadings(): void {
    this.minReading = Number.MAX_SAFE_INTEGER;
    this.maxReading = Number.MIN_SAFE_INTEGER;
  }

  private getSpirometerReadings() {
    this.connected = true;
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

    return +calibration.calibrate(rawReading, this.maxReading, this.maxReading, sensitivity).toFixed(2);
  }

  get device(): Observable<BluetoothDevice> {
    return this.gattService.getDevice();
  }
}
