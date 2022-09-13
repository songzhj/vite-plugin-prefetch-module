import { JSDOM } from 'jsdom';
import { OutputAsset, OutputBundle } from 'rollup';
import { createFilter, PluginOption, ResolvedConfig } from 'vite';

const PrefetchCode = (list: string[], baseUrl: string, concurrent: number) => `
(function () {
  function bf(urls, lmt) {
    let c = 0;
    function f() {
      const u = urls[c];
      if (!u) {
        return;
      }
      const a = '${baseUrl}' + u;
      const l = document.createElement("link");
      const support = l.relList && l.relList.supports && l.relList.supports('prefetch');
      if (support) {
        l.rel = "prefetch";
        l.href = a;
        l.onload = function () {
          l.onload = null;
          l.remove();
          f();
        };
        document.head.appendChild(l);
      } else {
        fetch(a, {credentials: 'same-origin'}).then(() => f())
      }
      c += 1;
    }
    for (let i = 0; i < lmt; ++i) {
      f();
    }
  }

  const idleCallback =
    window.requestIdleCallback || ((c) => setTimeout(c, 1500));

  idleCallback(() => {
    bf(JSON.parse('${JSON.stringify(list)}'), ${concurrent});
  });
})();
`;

const formatBaseUrl = (baseUrl: string) =>
  baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

const getExistedFileName = (dom: JSDOM, base: string): string[] => {
  const existingLinks: string[] = [];

  dom.window.document
    .querySelectorAll<HTMLScriptElement>('script')
    .forEach((s) => {
      if (!s.src) {
        return;
      }
      existingLinks.push(s.src);
    });

  dom.window.document
    .querySelectorAll<HTMLLinkElement>('link')
    .forEach((l) => existingLinks.push(l.href));

  return existingLinks
    .map((_) => _.replace(base, ''))
    .filter((_) => _.startsWith('assets'));
};

const getCSSChunkFileNames = (bundle: OutputBundle): string[] => {
  const cssFilter = createFilter(['**/*.*.css']);
  return Object.values(bundle)
    .filter(
      (_): _ is OutputAsset => _.type === 'asset' && cssFilter(_.fileName),
    )
    .map((_) => _.fileName);
};

interface PrefetchPluginOptions {
  concurrent?: number;
}

export const PrefetchPlugin = ({
  concurrent = 3,
}: PrefetchPluginOptions): PluginOption => {
  let viteConfig: ResolvedConfig;

  return {
    name: 'vite:vite-prefetch-plugin',
    enforce: 'post',
    apply: 'build',
    configResolved(config) {
      viteConfig = config;
    },
    transformIndexHtml: {
      enforce: 'post',
      transform: (html, ctx) => {
        const { bundle, chunk } = ctx;
        if (!bundle || !chunk?.dynamicImports?.length) {
          return html;
        }
        const baseUrl = formatBaseUrl(viteConfig.base ?? '');
        const dom = new JSDOM(html);
        const existedFileNames = getExistedFileName(dom, baseUrl);
        const cssFileNames = getCSSChunkFileNames(bundle);
        const seen = new Set<string>(existedFileNames);
        const modules: string[] = [];

        const getRelatedCssFileNames = (jsFileName: string) => {
          const jsBaseName = jsFileName.match(/assets\/(\S+)\.\S+\.js/)?.[1];
          if (!jsBaseName) {
            return [];
          }
          return cssFileNames.filter((_) => _.includes(jsBaseName));
        };

        const addFileNameToModules = (fileName: string) => {
          if (!fileName || seen.has(fileName)) {
            return;
          }
          modules.push(fileName);
          seen.add(fileName);
        };

        const travelImportedChunks = (chunks: string[]) => {
          chunks.forEach((file) => {
            const importee = bundle[file];
            if (importee?.type === 'chunk' && !seen.has(file)) {
              addFileNameToModules(file);
              const cssFileNames = getRelatedCssFileNames(file);
              cssFileNames.forEach(addFileNameToModules);
              travelImportedChunks([
                ...importee.dynamicImports,
                ...importee.imports,
              ]);
            }
          });
        };

        travelImportedChunks([...chunk.dynamicImports, ...chunk.imports]);

        const code = PrefetchCode(modules, baseUrl, concurrent);
        const script = dom.window.document.createElement('script');
        script.innerHTML = code;
        dom.window.document.body.appendChild(script);

        return dom.serialize();
      },
    },
  };
};
