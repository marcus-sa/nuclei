import { CircularDependencyException } from '../errors';
import { ModuleContainer } from './container';
import { Reflector } from '../reflector';
import { METADATA } from '../constants';
import { Registry } from '../registry';
import { Module } from './module';
import { Utils } from '../util';
import {
  DynamicModule,
  ForwardRef,
  ModuleImport,
  Provider,
  Token,
  Type,
} from '../interfaces';

export class Scanner {
  constructor(private readonly container: ModuleContainer) {}

  public async scan(module: Type<Module>) {
    await this.scanForModules(module);
    await this.scanModulesForDependencies();
    await this.createModules();
  }

  private async createModules() {
    const modules = Utils.getValues<Module>(
      this.container.getReversedModules(),
    );

    for (const module of modules) {
      await module.create();
    }
  }

  private async scanForModules(
    module: ModuleImport,
    scope: Type<Module>[] = [],
    ctxRegistry: ModuleImport[] = [],
  ) {
    await this.storeModule(module, scope);
    ctxRegistry.push(module);

    if (Registry.hasForwardRef(module)) {
      module = (<ForwardRef>module).forwardRef();
    }

    const imports = Reflector.get(<Type<Module>>module, METADATA.IMPORTS);
    const modules = Registry.isDynamicModule(module)
      ? [...imports, ...(module.imports || [])]
      : imports;

    console.log(modules);

    for (const innerModule of modules) {
      if (ctxRegistry.includes(innerModule)) continue;

      const scopedModules = Utils.concat(scope, module);
      await this.scanForModules(innerModule, scopedModules);
    }
  }

  private async storeModule(
    module: Partial<ModuleImport>,
    scope: Type<Module>[],
  ) {
    if (Registry.hasForwardRef(module)) {
      return await this.container.addModule(
        (<ForwardRef>module).forwardRef(),
        scope,
      );
    }

    await this.container.addModule(module, scope);
  }

  public async storeImport(
    related: ModuleImport,
    token: string,
    context: string,
  ) {
    if (!related) throw new CircularDependencyException(context);

    if (Registry.hasForwardRef(related)) {
      return await this.container.addImport(
        (<ForwardRef>related).forwardRef(),
        token,
      );
    }

    await this.container.addImport(
      <Type<Module> | DynamicModule>related,
      token,
    );
  }

  public async scanModulesForDependencies() {
    const modules = this.container.getReversedModules();

    for (const [token, module] of modules) {
      await this.reflectImports(module.target, token, module.target.name);
      await this.reflectProviders(module.target, token);
      this.reflectExports(module.target, token);
    }
  }

  private async reflectProviders(module: Type<Module>, token: string) {
    const providers = this.getDynamicMetadata<Provider>(
      module,
      token,
      METADATA.PROVIDERS as 'providers',
    );

    for (const provider of providers) {
      await this.storeProvider(provider, token);
    }
  }

  private async storeProvider(provider: Provider, token: string) {
    await this.container.addProvider(provider, token);
  }

  private getDynamicMetadata<T = Token>(
    module: Type<Module>,
    token: string,
    metadataKey: keyof DynamicModule,
  ): T[] {
    return [
      ...Reflector.get(module, metadataKey),
      ...this.container.getDynamicMetadataByToken(token, metadataKey),
    ];
  }

  private reflectExports(module: Type<Module>, token: string) {
    const exports = this.getDynamicMetadata(
      module,
      token,
      METADATA.EXPORTS as 'exports',
    );

    exports.forEach(exportedComponent =>
      this.storeExported(exportedComponent, token),
    );
  }

  private storeExported(component: Token, token: string) {
    this.container.addExported(component, token);
  }

  private async reflectImports(
    module: Type<Module>,
    token: string,
    context: string,
  ) {
    const modules = this.getDynamicMetadata(
      module,
      token,
      METADATA.IMPORTS as 'imports',
    );

    for (const related of modules) {
      await this.storeImport(related, token, context);
    }
  }
}
