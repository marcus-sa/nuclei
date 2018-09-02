import { Provider, MODULE_INITIALIZER } from '@one/core';
import deepstream = require('deepstream.io-client-js');

import { DEEPSTREAM_CLIENT, DEEPSTREAM_CLIENT_CONFIG } from './symbols';
import { DsClientConfig } from './ds-client-config.interface';
import { DsClientService } from './ds-client.service';

export const DEEPSTREAM_EXPORTS = [DEEPSTREAM_CLIENT, DsClientService];

export const DEEPSTREAM_CLIENT_PROVIDER: Provider = {
  provide: MODULE_INITIALIZER,
  useFactory: (config: DsClientConfig, dsClient: DsClientService) => {
    return dsClient.login(config.credentials);
  },
  deps: [DEEPSTREAM_CLIENT_CONFIG, DsClientService],
  multi: true,
};

export const DEEPSTREAM_PROVIDERS: Provider[] = [
  {
    provide: DEEPSTREAM_CLIENT,
    useFactory: (config: DsClientConfig) => deepstream(config.url),
    deps: [DEEPSTREAM_CLIENT_CONFIG],
  },
  DsClientService,
  DEEPSTREAM_CLIENT_PROVIDER,
];
