import { Type } from './interfaces';

import { Factory } from './factory';

export async function bootstrap(module: Type<any>) {
	const factory = new Factory(module);
	await factory.start();
}