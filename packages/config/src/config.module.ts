import { Module, MODULE_INITIALIZER, forwardRef } from '@one/core';

import { ConfigService } from './config.service';

@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {
  public static load(path: string) {
    return {
      module: ConfigModule,
      providers: [
        {
          provide: MODULE_INITIALIZER,
          useFactory: (config: ConfigService) => config.load(path),
          deps: [ConfigService],
          multi: true,
        },
      ],
    };
  }
}
