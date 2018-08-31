import { inject, LazyServiceIdentifer } from 'inversify';

import { Type, ForwardRef } from '../interfaces';
import { Registry } from '../registry';

function createLazyInjection(target: object, property: string) {
  return (lazyInject, provider) => lazyInject(provider)(target, property);
}

export function Inject(
  provider: Type<any> | symbol | ForwardRef,
): PropertyDecorator {
  return (target: object, property: string) => {
    if (!Registry.hasForwardRef(provider)) {
      return inject(<any>provider)(target, property);
    }

    return inject(
      new LazyServiceIdentifer(() => (<ForwardRef>provider).forwardRef()),
    )(target, property);
    /*Registry.lazyInjects.add({
      target: target.constructor,
      forwardRef: <ForwardRef>provider,
      lazyInject: createLazyInjection(target, property),
    });*/
  };
}
