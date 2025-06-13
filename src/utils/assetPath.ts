/**
 * Helper function to properly format asset paths with the correct base path
 * Works for both web deployment and Tauri desktop app
 */
export const assetPath = (path: string): string => {
  const basePath = import.meta.env.VITE_BASE_PATH || '/';
  // Remove leading slash from path if it exists
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${basePath}${cleanPath}`;
};

/**
 * Helper specifically for public directory assets
 */
export const publicPath = (filename: string): string => {
  return assetPath(`public/${filename}`);
};
