import { Container } from 'inversify';

import { APP_INITIALIZER } from './constants';
import { Type } from './interfaces';
import { DependenciesScanner, Registry, ModuleContainer } from './module';

// @TODO: Figure out why <https://github.com/inversify/InversifyJS/blob/master/wiki/hierarchical_di.md> doesn't work
export class Factory {
  private readonly container = new ModuleContainer();
  private readonly registry = new Registry(this.container);
  private readonly scanner = new DependenciesScanner(this.container);

  constructor(private readonly module: Type<any>) {}

  public async start() {
    await this.scanner.scan(this.module);

    /*await Promise.all(
      this.registry.getAllProviders(<any>APP_INITIALIZER),
    );*/
  }
}
