import { IConfiguration } from '@cucumber/cucumber';

const config: Partial<IConfiguration> = {
  paths: ['tests/acceptance/features/**/*.feature'],
  require: ['tests/acceptance/step-definitions/**/*.ts'],
  requireModule: ['ts-node/register'],
  format: ['@cucumber/pretty-formatter'],
  publishQuiet: true,
};

export default config;
