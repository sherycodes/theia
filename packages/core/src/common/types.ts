// *****************************************************************************
// Copyright (C) 2017 TypeFox and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
// *****************************************************************************

export { ArrayUtils } from './array-utils';
export { Prioritizeable } from './prioritizeable';

type UnknownObject<T extends object> = Record<string | number | symbol, unknown> & { [K in keyof T]: unknown };

export interface Prototype {
    [property: string | number | symbol]: unknown
    constructor: Function
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyFunction = (...params: any[]) => any;
export type Deferred<T> = { [P in keyof T]: Promise<T[P]> };
export type Extends<T, U extends T> = U;
export type MaybeArray<T> = T | T[];
/**
 * This type is useful when dealing with module exports where APIs are either
 * returned directly or inside a namespace object as `default`.
 */
export type MaybeDefault<T> = T | { default: T };
export type MaybePromise<T> = T | PromiseLike<T>;
export type MaybeNull<T> = { [P in keyof T]: T[P] | null };
export type MaybeUndefined<T> = { [P in keyof T]?: T[P] | undefined };
export type Mutable<T> = { -readonly [P in keyof T]: T[P] };
/**
 * Common API pattern for event listeners.
 */
export type Listener<E, T extends AnyFunction = () => void> = (event: E, ...params: Parameters<T>) => ReturnType<T>;
export type RecursivePartial<T> = {
    [P in keyof T]?: T[P] extends (infer I)[]
    ? RecursivePartial<I>[]
    : RecursivePartial<T[P]>;
};
export type ToPromise<T> = T extends PromiseLike<infer U> ? Promise<U> : Promise<T>;

/**
 * Common API for logging info messages, e.g. {@link console.log}.
 */
export interface InfoLogger {
    log(...data: unknown[]): void;
}

/**
 * Common API for logging info messages, e.g. {@link console.warn}.
 */
export interface WarningLogger {
    warn(...data: unknown[]): void;
}

/**
 * Common API for logging info messages, e.g. {@link console.error}.
 */
export interface ErrorLogger {
    error(...data: unknown[]): void;
}

/**
 * Common API pattern for sending messages, e.g. {@link MessagePort.postMessage}.
 */
export interface PostMessage<O = unknown> {
    postMessage(message: unknown, options?: O): void;
}

export function isBoolean(value: unknown): value is boolean {
    return value === true || value === false;
}

export function isString(value: unknown): value is string {
    return typeof value === 'string' || value instanceof String;
}

export function isNumber(value: unknown): value is number {
    return typeof value === 'number' || value instanceof Number;
}

export function isError(value: unknown): value is Error {
    return value instanceof Error;
}

export function isErrorLike(value: unknown): value is Error {
    return isObject(value) && isString(value.name) && isString(value.message) && (isUndefined(value.stack) || isString(value.stack));
}

// eslint-disable-next-line space-before-function-paren
export function isFunction<T extends (...args: unknown[]) => unknown>(value: unknown): value is T {
    return typeof value === 'function';
}

export function isObject<T extends object>(value: unknown): value is UnknownObject<T> {
    // eslint-disable-next-line no-null/no-null
    return typeof value === 'object' && value !== null;
}

export function isUndefined(value: unknown): value is undefined {
    return typeof value === 'undefined';
}

/**
 * @param value value to check.
 * @param every optional predicate ran on every element of the array.
 * @param thisArg value to substitute `this` with when invoking in the predicate.
 * @returns whether or not `value` is an array.
 */
export function isArray<T>(value: unknown, every?: (value: unknown) => unknown, thisArg?: unknown): value is T[] {
    return Array.isArray(value) && (!isFunction(every) || value.every(every, thisArg));
}

export function isStringArray(value: unknown): value is string[] {
    return isArray(value, isString);
}

export function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
    return isObject<PromiseLike<unknown>>(value) && typeof value.then === 'function';
}

/**
 * note: `null` is not considered a valid prototype even if it can be returned
 * by {@link Object.getPrototypeOf} in some cases.
 */
export function isPrototype(value: unknown): value is Prototype {
    return isObject(value) &&
        Object.prototype.hasOwnProperty.call(value, 'constructor') &&
        typeof value.constructor === 'function' &&
        value.constructor.prototype === value;
}

/**
 * Typed wrapper around {@link Object.getPrototypeOf}.
 */
export function getPrototypeOf(value: unknown): Prototype | null {
    return Object.getPrototypeOf(value);
}

/**
 * @returns all prototypes except `value` nor `null` at the end of the chain.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function* iterPrototypes(value: any): Iterable<object> {
    // eslint-disable-next-line no-null/no-null, curly
    if (value !== undefined && value !== null) while (value = Object.getPrototypeOf(value)) {
        yield value;
    }
}

/**
 * Creates a shallow copy with all ownkeys of the original object that are `null` made `undefined`
 */
export function nullToUndefined<T>(nullable: MaybeNull<T>): MaybeUndefined<T> {
    const undefinable = { ...nullable } as MaybeUndefined<T>;
    for (const key in nullable) {
        // eslint-disable-next-line no-null/no-null
        if (nullable[key] === null && Object.prototype.hasOwnProperty.call(nullable, key)) {
            undefinable[key] = undefined;
        }
    }
    return undefinable;
}

/**
 * Throws when called and statically makes sure that all variants of a type were consumed.
 */
export function unreachable(_never: never, message: string = 'unhandled case'): never {
    throw new Error(message);
}

/**
 * Wraps `callbackfn` into a function that never throws and logs errors.
 *
 * Doesn't handle async functions.
 */
export function logError<A extends unknown[], R extends unknown>(callbackfn: (...params: A) => R, logger?: ErrorLogger): (...params: A) => R | undefined;
export function logError(callbackfn: (...params: unknown[]) => unknown, logger: ErrorLogger = console): (...params: unknown[]) => unknown {
    return function (this: unknown): unknown {
        'use strict';
        try {
            return callbackfn.apply(this, arguments);
        } catch (error) {
            logger!.error(error);
        }
    };
}
