import { Module } from './module';
import {
	DynamicModule,
	ProvideToken,
	ModuleImport,
	ILazyInject,
	ForwardRef,
	Provider,
	Type,
} from './interfaces';

export class Registry {

	public static readonly lazyInjects = new Set<ILazyInject>();
	public readonly modules = new Map<Type<any>, Module>();

	public static getLazyInjects(target: Type<any>): ILazyInject[] {
		return [...this.lazyInjects.values()].filter(
			provider => provider.target === target,
		);
	}

	public static isForwardRef(provider: Type<any> | symbol | ForwardRef) {
		return provider.hasOwnProperty('forwardRef');
	}

	public static getForwardRef(provider: Type<any> | symbol | ForwardRef) {
		return Registry.isForwardRef(provider)
			? (<ForwardRef>provider).forwardRef()
			: provider;
	}

	public static flatten(arr: any[][]) {
		return arr.reduce((previous, current) => [...previous, ...current]);
	}

	public isModuleRef(ref: any) {
		return this.modules.has(ref);
	}

	public isModule(module: any) {
		return !!(module && module.imports && module.exports);
	}

	public getModule(target: Type<any>): Module {
		return [...this.modules.values()].find(
			module => module.target === target,
		);
	}

	public getProvider(provider: Provider, modules: Module[] | IterableIterator<Module> = this.modules.values()) {
		const token = this.getProviderToken(provider);

		for (const { providers } of modules) {
			if (providers.isBound(token)) {
				return providers.get(token);
			}
 		}
	}

	public static pick<T = any>(from: any[], by: any[]): T[] {
		return from.filter(f => by.includes(f));
	}

	public async getDependencyFromTree(module: Module, dependency: Provider) {
		const token = this.getProviderToken(dependency);
		const modules = new Set<string>();
		let provider: Type<any>;

		const findDependency = async (module: Module) => {
			if (provider || !this.isModule(module) || modules.has(module.target.name)) return;

			modules.add(module.target.name);

			if (module.providers.isBound(token)) {
				provider =
					module.registry.isProviderBound(dependency)
						? module.registry.getProvider(dependency)
						: module.providers.get(token);
			}

			const imports = module.imports.map(async (moduleRef) => {
				const imported = this.getModule(
					await this.resolveModule(moduleRef)
				);

				// @TODO: Need to figure out where we are in the loop so we can check if the module exists in exports
				const modules = Registry.pick(module.imports, module.exports);
				modules && await findDependency(imported);
			});

			const exports = module.exports.map(async (ref) => {
				const exported = this.getModule(<Type<any>>ref);

				if (ref === dependency) {
					provider = module.registry.getProvider(dependency);
					return;
				}

				await findDependency(exported);
			});

			await Promise.all([...imports, ...exports]);
		};

		await findDependency(module);

		if (!provider) {
			// @TODO: Log real modules tree
			throw new Error(`Couldn't find provider ${this.getProviderName(dependency)} in tree: ${[...modules].join(' -> ')}`);
		}

		return provider;
	}

	public async resolveModule(module: ModuleImport | Promise<DynamicModule>): Promise<Type<any>> {
		if ((<Promise<DynamicModule>>module).then) {
			return (await (<Promise<DynamicModule>>module)).module;
		} else if ((<DynamicModule>module).module) {
			return (<DynamicModule>module).module;
		}

		return <Type<any>>module;
	}

	public getAllProviders(provider: Provider) {
		const token = this.getProviderToken(provider);

		return Registry.flatten(
			[...this.modules.values()].map(({ providers }) => {
				return providers.isBound(token)
					? providers.getAll(token)
					: [];
			}),
		);
	}

	public getProviderName(provider: Provider) {
		return (<ProvideToken>provider).provide
			? (<ProvideToken>provider).provide.toString()
			: (<Type<any>>provider).name;
	}

	public getProviderToken(provider: Provider) {
		return (<ProvideToken>provider).provide || <Type<any>>provider;
	}

	public isProviderBound(provider: Provider) {
		return [...this.modules.values()].some(
			({ providers }) => providers.isBound(this.getProviderToken(provider)),
		);
	}

}
