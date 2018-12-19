export const sleep = (t = 0) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, t);
export const wait = (t = 0) => new Promise(ok => setTimeout(ok, t));
