import { Component, OnInit } from '@angular/core';
import { SpiromagicService } from 'src/app/_services/spiromagic.service';

@Component({
  selector: 'app-connect',
  templateUrl: './connect.component.html',
  styleUrls: ['./connect.component.scss']
})
export class ConnectComponent implements OnInit {

  isConnecting = false;

  constructor(
    public spiromagicService: SpiromagicService
  ) { }


  ngOnInit(): void {
  }

  connect(): void {
    this.isConnecting = true;
    this.spiromagicService.connect();
  }
}
