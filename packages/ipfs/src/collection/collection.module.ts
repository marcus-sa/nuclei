import {
  DynamicModule,
  Module,
  MODULE_INITIALIZER,
  ModuleWithProviders,
  Type,
} from '@one/core';

import { CollectionRegistry } from './collection-registry.service';

@Module()
export class CollectionModule {
  public static forFeature(collections: Type<any>[]): DynamicModule {
    const providers = CollectionRegistry.create(collections);

    return {
      module: CollectionModule,
      exports: providers,
      providers,
    };
  }
}
