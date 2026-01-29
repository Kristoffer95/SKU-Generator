import { Config } from "@remotion/cli/config";
import { enableTailwind } from "@remotion/tailwind";

Config.overrideWebpackConfig((currentConfiguration) => {
  const tailwindConfig = enableTailwind(currentConfiguration);

  // Add .js extension resolution to handle TypeScript NodeNext imports
  return {
    ...tailwindConfig,
    resolve: {
      ...tailwindConfig.resolve,
      extensionAlias: {
        ".js": [".js", ".ts", ".tsx"],
      },
    },
  };
});
