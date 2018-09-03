import { APP_INITIALIZER, Module, ModuleWithProviders, Type } from '@one/core';

import { DsRpcService } from './rpc.service';
import { RpcProvider } from './interfaces';

@Module()
export class DsRpcModule {
  public static forFeature(
    providers: Type<RpcProvider>[],
  ): ModuleWithProviders {
    return {
      module: DsRpcModule,
      providers: [
        ...providers,
        DsRpcService,
        {
          provide: APP_INITIALIZER,
          useFactory: (rpc: DsRpcService) => rpc.add(providers),
          deps: [DsRpcService],
          multi: true,
        },
      ],
    };
  }
}
