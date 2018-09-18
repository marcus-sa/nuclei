import 'reflect-metadata';

import { SCOPE_METADATA, INJECTABLE_METADATA, SHARED_MODULE_METADATA } from './constants';
import { Type, Provider } from './interfaces';
import { Module } from './module';

export class Reflector {
  public static defineByKeys<T = object>(
    target: T,
    metadata: { [name: string]: any },
    exclude: string[] = [],
  ): T {
    Object.keys(metadata)
      .filter(p => !exclude.includes(p))
      .forEach(property => {
        Reflect.defineMetadata(property, metadata[property], target);
      });

    return target;
  }

  public static get(
    target: Type<Provider | Module>,
    metadataKey: string | symbol,
  ) {
    return Reflect.getMetadata(metadataKey, <Provider>target) || [];
  }

  public static isGlobalModule(target: Type<Module>) {
    return !!Reflect.getMetadata(SHARED_MODULE_METADATA, target);
  }

  public static isProvider(target: any) {
    return !!Reflect.getMetadata(INJECTABLE_METADATA, target);
  }

  public static resolveProviderScope(provider: Type<Provider>) {
    return Reflect.getMetadata(SCOPE_METADATA, provider);
  }
}
