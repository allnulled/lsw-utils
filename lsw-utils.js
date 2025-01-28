(function (factory) {
  const mod = factory();
  if (typeof window !== 'undefined') {
    window['LswUtils'] = mod;
  }
  if (typeof global !== 'undefined') {
    global['LswUtils'] = mod;
  }
  if (typeof module !== 'undefined') {
    module.exports = mod;
  }
})(function () {

  const LswUtils = {};

  LswUtils.hello = () => console.log("Hello!");

  return LswUtils;
});