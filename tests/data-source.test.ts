import { describe, it, expect, vi } from 'vitest';
import { DataSource } from '../src/lib/data-source';
import type { DropdownItem } from '../src/lib/types';

const ITEMS: DropdownItem[] = [
	{ value: 1, text: 'Яблоко' },
	{ value: 2, text: 'Апельсин' },
	{ value: 3, text: 'Банан' },
];

describe('DataSource', () => {
	// ========================================================================
	// Конструктор
	// ========================================================================
	describe('конструктор', () => {
		it('должен создаваться с синхронным массивом', () => {
			const ds = new DataSource(ITEMS);

			expect(ds).toBeDefined();
			expect(ds.getData()).toEqual(ITEMS);
			expect(ds.isLoading()).toBe(false);
		});

		it('должен создаваться с Promise', () => {
			const ds = new DataSource(Promise.resolve(ITEMS));

			expect(ds).toBeDefined();
			expect(ds.getData()).toBeNull();
		});

		it('должен создаваться с функцией-фетчером', () => {
			const ds = new DataSource(() => Promise.resolve(ITEMS));

			expect(ds).toBeDefined();
			expect(ds.getData()).toBeNull();
		});
	});

	// ========================================================================
	// fetch()
	// ========================================================================
	describe('fetch()', () => {
		it('синхронный массив — возвращает кэш без запроса', async () => {
			const ds = new DataSource(ITEMS);
			const result = await ds.fetch();

			expect(result).toEqual(ITEMS);
			expect(ds.isLoading()).toBe(false);
		});

		it('синхронный массив с force — эмитит load', async () => {
			const ds = new DataSource(ITEMS);
			const loadHandler = vi.fn();
			ds.on('load', loadHandler);

			await ds.fetch(true);

			expect(loadHandler).toHaveBeenCalledWith(ITEMS);
		});

		it('синхронный массив — НЕ эмитит loading', async () => {
			const ds = new DataSource(ITEMS);
			const loadingHandler = vi.fn();
			ds.on('loading', loadingHandler);

			await ds.fetch();

			expect(loadingHandler).not.toHaveBeenCalled();
		});

		it('Promise — загружает данные и кэширует', async () => {
			const ds = new DataSource(Promise.resolve(ITEMS));

			const result = await ds.fetch();

			expect(result).toEqual(ITEMS);
			expect(ds.getData()).toEqual(ITEMS);
		});

		it('функция-фетчер — загружает данные и кэширует', async () => {
			const fetcher = vi.fn(() => Promise.resolve(ITEMS));
			const ds = new DataSource(fetcher);

			const result = await ds.fetch();

			expect(result).toEqual(ITEMS);
			expect(ds.getData()).toEqual(ITEMS);
			expect(fetcher).toHaveBeenCalledOnce();
		});

		it('повторный fetch без force — возвращает кэш без нового запроса', async () => {
			const fetcher = vi.fn(() => Promise.resolve(ITEMS));
			const ds = new DataSource(fetcher);

			await ds.fetch();
			await ds.fetch();

			expect(fetcher).toHaveBeenCalledOnce();
		});

		it('fetch с force — делает новый запрос', async () => {
			const fetcher = vi.fn(() => Promise.resolve(ITEMS));
			const ds = new DataSource(fetcher);

			await ds.fetch();
			await ds.fetch(true);

			expect(fetcher).toHaveBeenCalledTimes(2);
		});

		it('эмитит loading перед запросом', async () => {
			const ds = new DataSource(() => Promise.resolve(ITEMS));
			const loadingHandler = vi.fn();
			ds.on('loading', loadingHandler);

			await ds.fetch();

			expect(loadingHandler).toHaveBeenCalledOnce();
		});

		it('эмитит load после успешной загрузки', async () => {
			const ds = new DataSource(() => Promise.resolve(ITEMS));
			const loadHandler = vi.fn();
			ds.on('load', loadHandler);

			await ds.fetch();

			expect(loadHandler).toHaveBeenCalledWith(ITEMS);
		});

		it('эмитит error и пробрасывает ошибку при неудаче', async () => {
			const error = new Error('Network error');
			const ds = new DataSource(() => Promise.reject(error));
			const errorHandler = vi.fn();
			ds.on('error', errorHandler);

			await expect(ds.fetch()).rejects.toThrow('Network error');
			expect(errorHandler).toHaveBeenCalledWith(error);
		});

		it('isLoading возвращает false после загрузки', async () => {
			const ds = new DataSource(() => Promise.resolve(ITEMS));

			await ds.fetch();

			expect(ds.isLoading()).toBe(false);
		});

		it('isLoading возвращает false после ошибки', async () => {
			const ds = new DataSource(() => Promise.reject(new Error('fail')));

			try {
				await ds.fetch();
			} catch {
				// ожидаемо
			}

			expect(ds.isLoading()).toBe(false);
		});
	});

	// ========================================================================
	// invalidate()
	// ========================================================================
	describe('invalidate()', () => {
		it('сбрасывает кэш', async () => {
			const ds = new DataSource(() => Promise.resolve(ITEMS));
			await ds.fetch();

			expect(ds.getData()).toEqual(ITEMS);

			ds.invalidate();

			expect(ds.getData()).toBeNull();
		});

		it('после invalidate — fetch делает новый запрос', async () => {
			const fetcher = vi.fn(() => Promise.resolve(ITEMS));
			const ds = new DataSource(fetcher);

			await ds.fetch();
			ds.invalidate();
			await ds.fetch();

			expect(fetcher).toHaveBeenCalledTimes(2);
		});
	});

	// ========================================================================
	// getData()
	// ========================================================================
	describe('getData()', () => {
		it('возвращает null до загрузки (асинхронный)', () => {
			const ds = new DataSource(() => Promise.resolve(ITEMS));
			expect(ds.getData()).toBeNull();
		});

		it('возвращает данные после загрузки', async () => {
			const ds = new DataSource(() => Promise.resolve(ITEMS));
			await ds.fetch();
			expect(ds.getData()).toEqual(ITEMS);
		});

		it('возвращает массив сразу для синхронного', () => {
			const ds = new DataSource(ITEMS);
			expect(ds.getData()).toEqual(ITEMS);
		});
	});

	// ========================================================================
	// Порядок событий
	// ========================================================================
	describe('порядок событий', () => {
		it('loading → load — правильный порядок', async () => {
			const events: string[] = [];
			const ds = new DataSource(() => Promise.resolve(ITEMS));

			ds.on('loading', () => events.push('loading'));
			ds.on('load', () => events.push('load'));

			await ds.fetch();

			expect(events).toEqual(['loading', 'load']);
		});

		it('loading → error — правильный порядок при ошибке', async () => {
			const events: string[] = [];
			const ds = new DataSource(() => Promise.reject(new Error('fail')));

			ds.on('loading', () => events.push('loading'));
			ds.on('error', () => events.push('error'));

			try {
				await ds.fetch();
			} catch {
				// ожидаемо
			}

			expect(events).toEqual(['loading', 'error']);
		});
	});

	// ========================================================================
	// Интеграция с on/off/once
	// ========================================================================
	describe('EventEmitter интеграция', () => {
		it('unsubscribe от load работает', async () => {
			const ds = new DataSource(() => Promise.resolve(ITEMS));
			const handler = vi.fn();
			const unsub = ds.on('load', handler);

			unsub();
			await ds.fetch();

			expect(handler).not.toHaveBeenCalled();
		});

		it('once срабатывает только один раз', async () => {
			const fetcher = vi.fn(() => Promise.resolve(ITEMS));
			const ds = new DataSource(fetcher);
			const handler = vi.fn();
			ds.once('load', handler);

			await ds.fetch();
			ds.invalidate();
			await ds.fetch();

			expect(handler).toHaveBeenCalledOnce();
		});

		it('off снимает все подписки на событие', async () => {
			const ds = new DataSource(() => Promise.resolve(ITEMS));
			const handler1 = vi.fn();
			const handler2 = vi.fn();
			ds.on('load', handler1);
			ds.on('load', handler2);

			ds.off('load');
			await ds.fetch();

			expect(handler1).not.toHaveBeenCalled();
			expect(handler2).not.toHaveBeenCalled();
		});
	});
});
