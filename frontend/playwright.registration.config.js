import config from './playwright.config.js';
export default { ...config, testIgnore: [], testMatch: '**/registration.live.spec.js' };
