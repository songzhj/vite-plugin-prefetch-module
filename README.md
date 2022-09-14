# vite-plugin-prefetch-module

A [Vite plugin](https://github.com/vitejs/vite) for prefetching lazy load module (eg. React.lazy)

This plugin adds dynamic imports on build and prefetch them on page IDLE.

## 📦 Install

```
npm i -D vite-plugin-prefetch-module

# yarn
yarn add -D vite-plugin-prefetch-module
```

## 👨‍💻 Usage

```js
// vite.config.js / vite.config.ts
import VitePluginPrefetchModule from 'vite-plugin-prefetch-module';

export default {
  plugins: [VitePluginPrefetchModule({ concurrent: 3 })],
};
```

**Options**

- concurrent: limit max concurrent on prefetching
- fallbackDelayTime: setTimeout time when requestIdleCallback not available
