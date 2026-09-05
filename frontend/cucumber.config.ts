export default {
  paths: ['tests/acceptance/features/**/*.feature'],
  require: ['tests/acceptance/step-definitions/**/*.ts'],
  requireModule: ['ts-node/register'],
  format: ['@cucumber/pretty-formatter'],
  publishQuiet: true,
  // Scenarios authored during the nav-rework Gherkin pass that are not yet
  // implemented are tagged @pending. They are excluded here so CI stays green
  // while the contract is in place; each implementation PR removes the tag.
  tags: 'not @pending',
};
