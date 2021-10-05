import { Component, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ChartDataSets, ChartOptions, ChartType } from 'chart.js';
import { BaseChartDirective, Label } from 'ng2-charts';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subscription } from 'rxjs';

import { Calibration } from '../_models/calibration';
import { SeriesEntry } from '../_models/series-entry';
import { SpiromagicService } from '../_services/spiromagic.service';

@Component({
  selector: 'app-graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss']
})
export class GraphComponent implements OnInit, OnDestroy {
  chartType = "line" as ChartType;
  chartData: ChartDataSets[] = [
    { data: [], label: "Spirometer readings", fill: false }
  ];
  chartLabels: Label[] = [];
  chartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0
    },
    scales: {
      xAxes: [{
        ticks: {
          maxTicksLimit: this.deviceDetectorService.isDesktop() ? 10 : 5,
          max: this.deviceDetectorService.isDesktop() ? 20 : 10
        }
      }],
      yAxes: [{
        ticks: {
          beginAtZero: true,
          stepSize: 10,
          max: 100,
          min: 0
        }
      }]
    }
  }

  @ViewChild(BaseChartDirective) chart: BaseChartDirective;

  device: BluetoothDevice | null = null;
  lastReading: number;
  minReading: number;
  maxReading: number;

  calibrations = this.spiromagicService.calibrations;
  activeCalibration: Calibration | null = null;
  calibrationDescription: string;

  private subscriptionReading: Subscription | null;
  private subscriptionCalibration: Subscription | null;
  private subscriptionMinReading: Subscription | null;
  private subscriptionMaxReading: Subscription | null;

  constructor(
    public zone: NgZone,
    public spiromagicService: SpiromagicService,
    private deviceDetectorService: DeviceDetectorService
  ) { }

  ngOnInit() {
    // this.fakeValues();
    this.setupSpirometer();
  }

  ngOnDestroy() {
    this.subscriptionReading.unsubscribe();
    this.subscriptionCalibration.unsubscribe();
    this.subscriptionMinReading.unsubscribe();
    this.subscriptionMaxReading.unsubscribe();
  }

  changeCalibration(calibration: Calibration): void {
    this.spiromagicService.calibration$.next(calibration);
  }

  private setupSpirometer(): void {
    this.subscriptionReading = this.spiromagicService.reading$.subscribe(reading => {
      this.pushReadingToGraph(reading);
    });
    this.subscriptionCalibration = this.spiromagicService.calibration$.subscribe(calibration => {
      this.calibrationDescription = this.calibrations.find(e => e.calibrationType === calibration.calibrationType).description;
      this.activeCalibration = calibration;
    });
    this.subscriptionCalibration = this.spiromagicService.minReading$.subscribe(minReading => {
      this.minReading = minReading;
    });
    this.subscriptionCalibration = this.spiromagicService.maxReading$.subscribe(maxReading => {
      this.maxReading = maxReading;
    });
  }

  private fakeValues(): void {
    setTimeout(() => {
      this.pushReadingToGraph(+Math.random().toFixed(2));
      this.fakeValues();
    }, 100);
  }

  private pushReadingToGraph(value: number): void {
    if (this.isGraphFull(this.chartData, this.deviceDetectorService.isDesktop() ? 100 : 20)) {
      this.removeLastElement();
    }

    const reading = {
      value: value,
      timestamp: new Date()
    };

    if (!this.minReading || reading.value < this.minReading)
      this.spiromagicService.minReading$.next(reading.value);
    if (!this.maxReading || reading.value > this.maxReading)
      this.spiromagicService.maxReading$.next(reading.value);

    this.lastReading = reading.value;
    this.chartData[0].data.push(reading.value);
    this.chartLabels.push(this.getLabel(reading));
  }

  private getLabel(event: SeriesEntry): string {
    return `${event.timestamp.getHours()}:${event.timestamp.getMinutes()}:${event.timestamp.getSeconds()}`
  }

  private removeLastElement(): void {
    this.chartData[0].data = this.chartData[0].data.slice(1);
    this.chartLabels = this.chartLabels.slice(1);
  }

  private isGraphFull(chartData: ChartDataSets[], limit: number): boolean {
    return chartData[0].data.length >= limit;
  }

  // series: SeriesEntry[] = [];
  // download() {
  //   var a = document.createElement("a");
  //   var file = new Blob([JSON.stringify(this.series)], { type: 'text/plain' });
  //   a.href = URL.createObjectURL(file);
  //   a.download = 'json.txt';
  //   a.click();
  // }
}
