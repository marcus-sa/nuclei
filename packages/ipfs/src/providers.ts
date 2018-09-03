import { Provider, MODULE_INITIALIZER, forwardRef } from '@one/core';
import IPFS = require('ipfs');

import { IPFS_CONFIG, IPFS_CLIENT } from './symbols';
import { IpfsConfig } from 'packages/ipfs/src/interfaces';
import { IpfsService } from 'packages/ipfs/src/ipfs.service';

export const IPFS_CLIENT_PROVIDER: Provider = {
  provide: MODULE_INITIALIZER,
  useFactory: (ipfs: IpfsService) => ipfs.start(),
  deps: [forwardRef(() => IpfsService)],
  multi: true,
};

export const IPFS_PROVIDERS: Provider[] = [
  /*{
    provide: IPFS_CLIENT,
    useFactory: (config: IpfsConfig) => 'lol',
    deps: [IPFS_CONFIG],
  },*/
  IPFS_CLIENT_PROVIDER,
];
