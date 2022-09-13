# vite-plugin-prefetch
A [Vite plugin](https://github.com/vitejs/vite) for prefetching lazy load module (eg. React.lazy)

This plugin adds dynamic imports on build and prefetch them on page IDLE.

## 📦 Install

```
npm i -D vite-plugin-prefetch

# yarn
yarn add -D vite-plugin-prefetch
```

## 👨‍💻 Usage

```js
// vite.config.js / vite.config.ts
import VitePluginPrefetch from 'vite-plugin-prefetch'

export default {
  plugins: [
    VitePluginPrefetch({ concurrent: 3 })
  ]
}
```

**Options**

* concurrent: limit max concurrent on prefetching
