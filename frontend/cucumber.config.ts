export default {
  paths: ['tests/acceptance/features/**/*.feature'],
  require: ['tests/acceptance/step-definitions/**/*.ts'],
  requireModule: ['ts-node/register'],
  format: ['@cucumber/pretty-formatter'],
  publishQuiet: true,
};
