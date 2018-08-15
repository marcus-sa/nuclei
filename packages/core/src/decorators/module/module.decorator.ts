import { ModuleMetadata } from '../../interfaces';

export function Module(metadata: ModuleMetadata = {}): ClassDecorator {
	return (target: object) => {
		Object.keys(metadata).forEach(property => {
			Reflect.defineMetadata(property, metadata[property], target);
		});
	};
}
