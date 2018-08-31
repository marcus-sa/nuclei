import { RpcStorage } from '../rpc.storage';

export function Provide(event: string): MethodDecorator {
  return (target: object, method: string) => {
    RpcStorage.eventProviders.add({
      target: target.constructor,
      method,
      event,
    });
  };
}
