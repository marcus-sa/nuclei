import 'reflect-metadata';
import { Injector, Type } from '@one/core';
import { BrowserWindow } from 'electron';

import { MetadataStorage } from '../storage';
import { METADATA } from '../metadata';

export class EventManager {

  constructor(
    private readonly injector: Injector,
    private readonly provider: Type<any>,
  ) {}

  private getProvider() {
    return this.injector.get(this.provider);
  }

  private getEvents() {
    return MetadataStorage.getEventsByType(this.provider);
  }

  /*private getType() {
    return Reflect.getMetadata(METADATA.TYPE, this.provider);
  }*/

  public bindWindowEvents(windowRef: BrowserWindow) {
    const provider = this.getProvider();
    const events = this.getEvents();

    console.log(windowRef);

    events.forEach(event => {
      windowRef.on(<any>event.name, (...args: any[]) => {
        return (<any>provider)[event.method](...args);
      });
    });
  }

}