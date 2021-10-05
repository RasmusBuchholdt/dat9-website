import { Injectable } from '@angular/core';
import { BluetoothCore } from '@manekinekko/angular-web-bluetooth';
import { Observable } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class GATTCharacteristicService {

  private gattPrimaryService = '';
  private gattCharacteristic = '';
  private scanFilters: BluetoothLEScanFilter[] = [];

  constructor(
    public bluetoothCoreService: BluetoothCore
  ) { }

  getDevice() {
    return this.bluetoothCoreService.getDevice$();
  }

  stream(service: string, characteristic: string, filters?: BluetoothLEScanFilter[]): Observable<DataView> {
    this.gattPrimaryService = service;
    this.gattCharacteristic = characteristic;
    this.scanFilters = filters;
    return this.bluetoothCoreService.streamValues$().pipe(map((value: DataView) => value));
  }

  disconnectDevice() {
    this.bluetoothCoreService.disconnectDevice();
  }

  value() {
    return this.bluetoothCoreService
      // Trigger the discovery process
      .discover$({
        optionalServices: [this.gattPrimaryService],
        filters: this.scanFilters
      })
      .pipe(
        // Get the service
        mergeMap((gatt: BluetoothRemoteGATTServer) => {
          return this.bluetoothCoreService.getPrimaryService$(gatt, this.gattPrimaryService);
        }),
        // Get the characteristic for the given service
        mergeMap((primaryService: BluetoothRemoteGATTService) => {
          return this.bluetoothCoreService.getCharacteristic$(primaryService, this.gattCharacteristic);
        }),
        // Get the value of that characteristic in form of a DataView
        mergeMap((characteristic: BluetoothRemoteGATTCharacteristic) => {
          return this.bluetoothCoreService.readValue$(characteristic);
        }),
        // Work some magic on teh value
        map((value: DataView) => value)
      )
  }
}
