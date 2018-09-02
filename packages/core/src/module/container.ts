import {
  DynamicModule,
  ModuleImport,
  Provider,
  Token,
  Type,
} from '../interfaces';
import { UnknownModuleException, InvalidModuleException } from '../errors';
import { ModuleCompiler } from './compiler';
import { Registry } from '../registry';
import { Module } from './module';
import { Utils } from '../util';

export class ModuleContainer {
  private readonly moduleCompiler = new ModuleCompiler();
  private readonly modules = new Map<string, Module>();
  private readonly dynamicModulesMetadata = new Map<
    string,
    Partial<DynamicModule>
  >();

  public getProvider(provider: Token, modules = this.modules.values()) {
    for (const { providers } of modules) {
      if (providers.isBound(provider)) {
        return providers.get(provider);
      }
    }

    throw new Error(provider.toString() + ' could not be found');
  }

  public getAllProviders(provider: Provider, target?: Type<Module>) {
    const token = Registry.getProviderToken(provider);
    const modules = this.getReversedModules();
    const values = Utils.getValues<string, Module>(modules);

    return Utils.flatten(
      values
        .filter(module => !target || module.target === target)
        .map(
          ({ providers }) =>
            providers.isBound(token) ? providers.getAll(token) : [],
        ),
    );
  }

  public getModuleValues() {
    return Utils.getValues<string, Module>(this.modules.entries());
  }

  public hasModuleRef(module: Type<any>) {
    return this.getModuleValues().some(({ target }) => target === module);
  }

  public getModuleRef(module: Type<any>) {
    return this.getModuleValues().find(({ target }) => target === module);
  }

  public getModule(token: string) {
    if (!this.modules.has(token)) {
      throw new UnknownModuleException([]);
    }

    return <Module>this.modules.get(token);
  }

  public getReversedModules() {
    return [...this.modules.entries()].reverse();
  }

  public getModules() {
    return this.modules;
  }

  public async createModules() {
    await Promise.all(
      Utils.getValues<string, Module>(this.getReversedModules()).map(
        async module => {
          await module.create();
        },
      ),
    );
  }

  public async addProvider(provider: Provider, token: string) {
    const module = this.getModule(token);
    await module.addProvider(provider);
  }

  public addExported(component: Token, token: string) {
    const module = this.getModule(token);
    module.addExported(component);
  }

  public async addModule(module: Partial<ModuleImport>, scope: Type<Module>[]) {
    if (!module) throw new InvalidModuleException(scope);

    const {
      target,
      dynamicMetadata,
      token,
    } = await this.moduleCompiler.compile(module, scope);
    if (this.modules.has(token)) return;

    const moduleRef = new Module(target, scope, this);
    moduleRef.addGlobalProviders();
    this.modules.set(token, moduleRef);

    const modules = Utils.concat<Type<Module>>(scope, target);
    this.addDynamicMetadata(token, dynamicMetadata!, modules);
  }

  private addDynamicMetadata(
    token: string,
    dynamicModuleMetadata: Partial<DynamicModule>,
    scope: Type<any>[],
  ) {
    if (!dynamicModuleMetadata) return;

    this.dynamicModulesMetadata.set(token, dynamicModuleMetadata);
    this.addDynamicModules(dynamicModuleMetadata.imports, scope);
  }

  private addDynamicModules(modules: ModuleImport[] = [], scope: Type<any>[]) {
    modules.forEach(module => this.addModule(module, scope));
  }

  public async addImport(relatedModule: ModuleImport, token: string) {
    // if (!this.modules.has(token)) return;

    const module = this.getModule(token);
    const scope = Utils.concat<Type<Module>>(module.scope, module.target);

    const { token: relatedModuleToken } = await this.moduleCompiler.compile(
      relatedModule,
      scope,
    );

    const related = this.getModule(relatedModuleToken);
    module.addImport(related);
  }

  public getDynamicMetadataByToken(token: string, key: keyof DynamicModule) {
    const metadata = this.dynamicModulesMetadata.get(token);
    return metadata && metadata[key] ? metadata[key] : [];
  }
}
