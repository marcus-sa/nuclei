import { ModuleCompiler } from './compiler';
import { Reflector } from '../reflector';
import { Registry } from '../registry';
import { Module } from './module';
import { Utils } from '../util';
import {
  UnknownModuleException,
  InvalidModuleException,
  UnknownProviderException,
} from '../errors';
import {
  DynamicModule, ModuleExport,
  ModuleImport,
  Provider,
  Token,
  Type,
} from '../interfaces';

export class NestContainer {
  private readonly moduleCompiler = new ModuleCompiler();
  private readonly globalModules = new Set<Module>();
  private readonly modules = new Map<string, Module>();
  public readonly providerTokens: Token[] = [];
  private readonly dynamicModulesMetadata = new Map<
    string,
    Partial<DynamicModule>
  >();

  public isProviderBound(provider: Token) {
    return this.getModuleValues().some(({ providers }) =>
      providers.isBound(provider),
    );
  }

  public getProvider(provider: Token, scope: Type<Module>) {
    for (const { providers } of this.modules.values()) {
      if (providers.isBound(provider)) {
        return providers.get(provider);
      }
    }

    throw new UnknownProviderException(provider, scope);
  }

  public getAllProviders<T>(provider: Provider, target?: Type<Module>) {
    const token = Registry.getProviderToken(provider);
    const modules = this.getModuleValues();

    return Utils.flatten<T | Promise<Type<Provider>>>(
      Utils.filterWhen<Module>(
        modules,
        !!target,
        module => module.target === target,
      ).map(
        ({ providers }) =>
          providers.isBound(token) ? providers.getAll(token) : [],
      ),
    );
  }

  public getModuleValues() {
    return Utils.getValues<Module>(this.modules.entries());
  }

  public hasModuleRef(module: Type<Module>) {
    return this.getModuleValues().some(({ target }) => target === module);
  }

  public getModuleRef(module: Type<Module>): Module | undefined {
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

  public async addProvider(provider: Provider, token: string) {
    const module = this.getModule(token);
    await module.addProvider(provider);
  }

  public addExported(component: ModuleExport, token: string) {
    const module = this.getModule(token);
    module.addExported(component);
  }

  public addGlobalModule(module: Module) {
    this.globalModules.add(module);
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

    const modules = Utils.concat(scope, target);
    this.addDynamicMetadata(token, dynamicMetadata!, modules);
    Reflector.isGlobalModule(target) && this.addGlobalModule(moduleRef);
  }

  private addDynamicMetadata(
    token: string,
    dynamicModuleMetadata: Partial<DynamicModule>,
    scope: Type<Module>[],
  ) {
    if (!dynamicModuleMetadata) return;

    this.dynamicModulesMetadata.set(token, dynamicModuleMetadata);
    this.addDynamicModules(dynamicModuleMetadata.imports, scope);
  }

  private addDynamicModules(
    modules: ModuleImport[] = [],
    scope: Type<Module>[],
  ) {
    modules.forEach(module => this.addModule(module, scope));
  }


  public bindGlobalScope() {
    this.modules.forEach(module => this.bindGlobalsToImports(module));
  }

  private bindGlobalsToImports(module: Module) {
    this.globalModules.forEach(globalModule =>
      this.bindGlobalModuleToModule(module, globalModule),
    );
  }

  private bindGlobalModuleToModule(module: Module, globalModule: Module) {
    if (module === globalModule) return;
    module.addImport(globalModule);
  }

  public async addImport(relatedModule: ModuleImport, token: string) {
    if (!this.modules.has(token)) return;

    const module = this.getModule(token);
    const scope = Utils.concat(module.scope, module.target);

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
