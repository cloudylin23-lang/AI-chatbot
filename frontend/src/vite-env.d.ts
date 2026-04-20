declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}