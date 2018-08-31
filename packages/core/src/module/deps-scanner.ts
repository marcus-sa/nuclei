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

export class DependenciesScanner {
  constructor(private readonly container: ModuleContainer) {}

  public async scan(module: Type<any>) {
    await this.scanForModules(module);
    await this.scanModulesForDependencies();
    await this.container.createModules();
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

    const imports = Reflector.reflectMetadata(
      <Type<any>>module,
      METADATA.IMPORTS,
    );
    const modules = Registry.isDynamicModule(module)
      ? [...imports, ...(module.imports || [])]
      : imports;

    for (const innerModule of modules) {
      // if (ctxRegistry.includes(innerModule)) continue;
      const scopedModules = Utils.concat<Type<Module>>(scope, module);
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

  public async storeRelatedModule(
    related: Provider,
    token: string,
    context: string,
  ) {
    if (!related) throw new CircularDependencyException(context);

    if (Registry.hasForwardRef(related)) {
      return await this.container.addRelatedModule(
        (<ForwardRef>related).forwardRef(),
        token,
      );
    }

    await this.container.addRelatedModule(
      <Type<any> | DynamicModule>related,
      token,
    );
  }

  public async scanModulesForDependencies() {
    const modules = this.container.getReversedModules();

    for (const [token, module] of modules) {
      await this.reflectRelatedModules(
        module.target,
        token,
        module.target.name,
      );
      await this.reflectProviders(module.target, token);
      this.reflectExports(module.target, token);
      await module.create();
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
      ...Reflector.reflectMetadata(module, metadataKey),
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

  private async reflectRelatedModules(
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
      await this.storeRelatedModule(related, token, context);
    }
  }
}
