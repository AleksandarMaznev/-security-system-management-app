declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_API_URL?: string;
    EXPO_PUBLIC_API_KEY?: string;
  }
}

declare const process: { env: NodeJS.ProcessEnv };
