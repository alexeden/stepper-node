export function Validate<T = unknown>(...predicates: Array<((x: T) => boolean)>): ParameterDecorator {
  return (target: any, propertyKey, parameterIndex) => {
    const originalMethod = target[propertyKey];

    const newMethod = (...args: any[]) => {
      const parameterValue = args[parameterIndex];
      if (!predicates.every(fn => fn(parameterValue))) {
        // tslint:disable-next-line:max-line-length
        throw new Error(`Parameter #${parameterIndex + 1} of ${target.constructor.name}'s ${String(propertyKey)} method failed validation! The value provided was ${parameterValue}.`);
      }
      return originalMethod(...args);
    };

    Object.defineProperty(target, propertyKey, {
      value: newMethod.bind(target),
    });
  };
}

const isNumber = (x: unknown) => typeof x === 'number';
const isString = (x: unknown) => typeof x === 'string';
export const IsNumber = Validate(isNumber);
export const IsString = Validate(isString);
export const IsLessThan = (n: number) => Validate<number>(isNumber, x => x < n);
export const IsGreaterThan = (n: number) => Validate<number>(isNumber, x => x > n);
export const EqualsOneOf = <T>(...vals: T[]) => Validate<T>(x => vals.includes(x));
export const EqualsNoneOf = <T>(...vals: T[]) => Validate<T>(x => vals.every(val => val !== x));
