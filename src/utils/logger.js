const PREFIX = '[AirtekTV]';
const noop = () => {};

export function createLogger(scope) {
  const tag = `${PREFIX}[${scope}]`;
  return {
    debug: __DEV__ ? (...args) => console.log(tag, ...args) : noop,
    warn: __DEV__ ? (...args) => console.warn(tag, ...args) : noop,
    error: (...args) => console.error(tag, ...args),
  };
}
