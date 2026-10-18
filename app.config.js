const app = require('./app.json');

module.exports = () => {
  const expo = app.expo;
  if (process.env.GITHUB_PAGES === '1') {
    expo.experiments = { ...expo.experiments, baseUrl: '/stockify' };
  }
  return expo;
};
