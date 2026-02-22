import { describe, it, expect, vi } from 'vitest';
import { BaseEventEmitter } from '../src/bus-event-emmiter';

// Конкретная реализация для тестов (BaseEventEmitter — абстрактный)
type TestEvents = {
	greet: string;
	count: number;
	empty: void;
};

class TestEmitter extends BaseEventEmitter<TestEvents> {
	public triggerEmit<K extends keyof TestEvents>(event: K, payload: TestEvents[K]): void {
		this.emit(event, payload);
	}
}

describe('BaseEventEmitter', () => {
	// ========================================================================
	// on
	// ========================================================================
	describe('on()', () => {
		it('должен подписываться на событие и вызывать callback', () => {
			const emitter = new TestEmitter();
			const handler = vi.fn();

			emitter.on('greet', handler);
			emitter.triggerEmit('greet', 'hello');

			expect(handler).toHaveBeenCalledOnce();
			expect(handler).toHaveBeenCalledWith('hello');
		});

		it('должен поддерживать несколько подписчиков на одно событие', () => {
			const emitter = new TestEmitter();
			const handler1 = vi.fn();
			const handler2 = vi.fn();

			emitter.on('count', handler1);
			emitter.on('count', handler2);
			emitter.triggerEmit('count', 42);

			expect(handler1).toHaveBeenCalledWith(42);
			expect(handler2).toHaveBeenCalledWith(42);
		});

		it('должен возвращать функцию отписки', () => {
			const emitter = new TestEmitter();
			const handler = vi.fn();

			const unsubscribe = emitter.on('greet', handler);
			unsubscribe();
			emitter.triggerEmit('greet', 'hello');

			expect(handler).not.toHaveBeenCalled();
		});

		it('отписка одного подписчика не должна влиять на другие', () => {
			const emitter = new TestEmitter();
			const handler1 = vi.fn();
			const handler2 = vi.fn();

			const unsub1 = emitter.on('count', handler1);
			emitter.on('count', handler2);

			unsub1();
			emitter.triggerEmit('count', 10);

			expect(handler1).not.toHaveBeenCalled();
			expect(handler2).toHaveBeenCalledWith(10);
		});

		it('повторная отписка не должна ломать массив подписчиков', () => {
			const emitter = new TestEmitter();
			const handler = vi.fn();

			const unsub = emitter.on('greet', handler);
			unsub();
			unsub(); // повторный вызов

			emitter.triggerEmit('greet', 'test');
			expect(handler).not.toHaveBeenCalled();
		});
	});

	// ========================================================================
	// once
	// ========================================================================
	describe('once()', () => {
		it('должен вызвать callback только один раз', () => {
			const emitter = new TestEmitter();
			const handler = vi.fn();

			emitter.once('greet', handler);
			emitter.triggerEmit('greet', 'first');
			emitter.triggerEmit('greet', 'second');

			expect(handler).toHaveBeenCalledOnce();
			expect(handler).toHaveBeenCalledWith('first');
		});

		it('должен возвращать функцию отписки для once', () => {
			const emitter = new TestEmitter();
			const handler = vi.fn();

			const unsub = emitter.once('greet', handler);
			unsub();
			emitter.triggerEmit('greet', 'hello');

			expect(handler).not.toHaveBeenCalled();
		});
	});

	// ========================================================================
	// off
	// ========================================================================
	describe('off()', () => {
		it('должен удалять всех подписчиков для события', () => {
			const emitter = new TestEmitter();
			const handler1 = vi.fn();
			const handler2 = vi.fn();

			emitter.on('count', handler1);
			emitter.on('count', handler2);
			emitter.off('count');
			emitter.triggerEmit('count', 5);

			expect(handler1).not.toHaveBeenCalled();
			expect(handler2).not.toHaveBeenCalled();
		});

		it('off для несуществующего события не должен ломать работу', () => {
			const emitter = new TestEmitter();
			expect(() => emitter.off('empty')).not.toThrow();
		});
	});

	// ========================================================================
	// emit
	// ========================================================================
	describe('emit()', () => {
		it('emit без подписчиков не должен бросать ошибку', () => {
			const emitter = new TestEmitter();
			expect(() => emitter.triggerEmit('greet', 'hello')).not.toThrow();
		});

		it('должен передавать корректный payload', () => {
			const emitter = new TestEmitter();
			const handler = vi.fn();

			emitter.on('count', handler);
			emitter.triggerEmit('count', 0);
			emitter.triggerEmit('count', -1);
			emitter.triggerEmit('count', Number.MAX_SAFE_INTEGER);

			expect(handler).toHaveBeenNthCalledWith(1, 0);
			expect(handler).toHaveBeenNthCalledWith(2, -1);
			expect(handler).toHaveBeenNthCalledWith(3, Number.MAX_SAFE_INTEGER);
		});
	});
});

