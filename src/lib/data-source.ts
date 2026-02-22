import { BaseEventEmitter } from '../bus-event-emmiter';
import type { DataSourceEvents, DataSourceInput } from './types';

/**
 * DataSource — универсальный источник данных с поддержкой
 * синхронных массивов, Promise и функций-фетчеров.
 *
 * Наследует BaseEventEmitter — Observer-паттерн для уведомления
 * компонентов о загрузке, данных и ошибках.
 *
 * @example
 * ```ts
 * // Статический массив
 * const ds = new DataSource([{ value: 1, text: 'Один' }]);
 *
 * // Функция-фетчер (ленивая загрузка)
 * const ds = new DataSource(() => fetch('/api/items').then(r => r.json()));
 *
 * // Promise
 * const ds = new DataSource(fetch('/api/items').then(r => r.json()));
 *
 * ds.on('loading', () => console.log('Загружаем...'));
 * ds.on('load', (items) => console.log('Загружено:', items.length));
 * ds.on('error', (err) => console.error(err));
 * ```
 */
export class DataSource<T> extends BaseEventEmitter<DataSourceEvents<T>> {
	private readonly _input: DataSourceInput<T>;
	private _cache: T[] | null = null;
	private _loading = false;

	constructor(input: DataSourceInput<T>) {
		super();
		this._input = input;

		// Синхронный массив — сразу кладём в кэш
		if (Array.isArray(input)) {
			this._cache = input;
		}
	}

	/**
	 * Загрузить данные из источника.
	 *
	 * - Если кэш есть и `force !== true` — возвращает кэш без запроса.
	 * - Иначе: `emit('loading')` → запрос → `emit('load', data)`.
	 * - При ошибке: `emit('error', err)`, пробрасывает исключение.
	 */
	public async fetch(force = false): Promise<T[]> {
		// Кэш валиден → вернуть без запроса
		if (this._cache !== null && !force) {
			return this._cache;
		}

		// Статический массив — всегда возвращаем из _input
		if (Array.isArray(this._input)) {
			this._cache = this._input;
			this.emit('load', this._cache);
			return this._cache;
		}

		// Асинхронный запрос
		this._loading = true;
		this.emit('loading', undefined as void);

		try {
			const promise = typeof this._input === 'function'
				? this._input()
				: this._input;

			const data = await promise;

			this._cache = data;
			this._loading = false;
			this.emit('load', data);

			return data;
		}
		catch (error: unknown) {
			this._loading = false;
			this.emit('error', error);
			throw error;
		}
	}

	/** Синхронный геттер кэшированных данных */
	public getData(): T[] | null {
		return this._cache;
	}

	/** Сбросить кэш — следующий `fetch()` выполнит новый запрос */
	public invalidate(): void {
		this._cache = null;
	}

	/** Флаг активной загрузки */
	public isLoading(): boolean {
		return this._loading;
	}
}

