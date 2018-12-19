export const sleep = (n = 0) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n);
