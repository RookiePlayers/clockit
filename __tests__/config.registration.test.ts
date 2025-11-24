describe('configuration registration', () => {
  it('registers cloud settings keys', () => {
    const pkg = require('../package.json');
    const props = pkg?.contributes?.configuration?.properties ?? {};

    const keys = ['clockit.cloud.apiUrl', 'clockit.cloud.apiToken', 'clockit.cloud.enabled'];
    for (const key of keys) {
      expect(props[key]).toBeDefined();
      expect(props[key].type).toBeDefined();
    }
  });
});
