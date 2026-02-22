import './combobox-component.css';
import { BaseComponent } from './base-component';
import type {
	ComboboxComponentProps,
	ComboboxEvents,
	ComboboxState,
	DropdownItem,
	FilterStrategy,
} from './types';

/**
 * ComboboxComponent — компонент с текстовым вводом и фильтрацией списка.
 * Одиночный выбор. Инпут редактируемый — пользователь может печатать для поиска.
 *
 * @example
 * ```ts
 * const combobox = new ComboboxComponent({
 *   selector: '#my-input',
 *   items: [
 *     { value: 1, text: 'Яблоко' },
 *     { value: 2, text: 'Апельсин' },
 *   ],
 *   filter: 'contains',
 *   placeholder: 'Начните вводить...',
 * });
 *
 * combobox.on('change', (item) => console.log(item));
 * combobox.on('filtering', (text) => console.log('Фильтр:', text));
 * ```
 */
export class ComboboxComponent extends BaseComponent<ComboboxState, ComboboxEvents> {
	private readonly _listElement = document.createElement('ul');
	private readonly _filterStrategy: FilterStrategy;
	private readonly _minFilterLength: number;
	private readonly _debounceMs: number;
	private _debounceTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(props: ComboboxComponentProps) {
		const { selector, items, dataSource, placeholder, value, filter, minFilterLength, debounce } = props;

		if (items && dataSource) {
			throw new Error('[ComboboxComponent]: передайте items ИЛИ dataSource, но не оба');
		}

		const initialItems = items ?? [];

		const initialSelected = value != null
			? initialItems.find((item) => item.value === value) ?? null
			: null;

		super({
			selector,
			state: {
				opened: false,
				disabled: false,
				dataItems: [...initialItems],
				selectedItem: initialSelected,
				focusedIndex: -1,
				filterText: '',
				filteredItems: [...initialItems],
			},
		});

		this._filterStrategy = filter ?? 'contains';
		this._minFilterLength = minFilterLength ?? 0;
		this._debounceMs = debounce ?? 150;

		if (placeholder) {
			this._rootElement.placeholder = placeholder;
		}

		// Если уже есть выбранный элемент — отобразить его текст
		if (initialSelected) {
			this._rootElement.value = initialSelected.text;
		}

		this._setupListListeners();
		this._setupComboboxSubscriptions();
		this._setupComboboxInput();
		this._setupComboboxKeyboard();

		// Инициализация DataSource (если передан)
		if (dataSource) {
			this._initDataSource(dataSource);
		}
	}

	/**
	 * Геттер/сеттер текущего выбранного значения.
	 * - Без аргументов: возвращает выбранный элемент или null.
	 * - С аргументом: программно выбирает элемент по value.
	 */
	public value(): DropdownItem | null;
	public value(val: string | number): void;
	public value(val?: string | number): DropdownItem | null | void {
		if (val === undefined) {
			return this._stateManager.get('selectedItem');
		}

		const items = this._stateManager.get('dataItems');
		const item = items.find((i) => i.value === val);

		if (item && !item.disabled) {
			this._selectItem(item);
		}
	}

	/**
	 * Обновить список элементов.
	 * Сбрасывает выбор, если выбранный элемент отсутствует в новом списке.
	 */
	public setItems(items: DropdownItem[]): void {
		this._stateManager.set('dataItems', [...items]);

		// Перефильтровать с текущим текстом
		const filterText = this._stateManager.get('filterText');
		this._stateManager.set('filteredItems', this._applyFilter(items, filterText));

		const currentSelected = this._stateManager.get('selectedItem');
		if (currentSelected && !items.some(x => x.value === currentSelected.value)) {
			this._stateManager.set('selectedItem', null);
			this.root.value = '';
		}
	}

	/** Программная фильтрация */
	public filter(text: string): void {
		this._stateManager.set('filterText', text);
	}

	/** Рендер списка (отфильтрованных) элементов внутри попапа */
	protected _renderItems(): void {
		const filteredItems = this._stateManager.get('filteredItems');
		const selectedItem = this._stateManager.get('selectedItem');
		const focusedIndex = this._stateManager.get('focusedIndex');

		this._listElement.innerHTML = '';

		if (filteredItems.length === 0) {
			const noResults = document.createElement('li');
			noResults.className = 'stk-dropdown-no-results';
			noResults.textContent = 'Ничего не найдено';
			this._listElement.appendChild(noResults);
			return;
		}

		filteredItems.forEach((item, index) => {
			const li = document.createElement('li');
			li.className = 'stk-dropdown-item';
			li.textContent = item.text;
			li.dataset.value = String(item.value);
			li.dataset.index = String(index);

			if (selectedItem && selectedItem.value === item.value) {
				li.classList.add('stk-dropdown-item_selected');
			}
			if (index === focusedIndex) {
				li.classList.add('stk-dropdown-item_focused');
			}
			if (item.disabled) {
				li.classList.add('stk-dropdown-item_disabled');
			}

			this._listElement.appendChild(li);
		});
	}

	/** Hook: монтировать список при открытии попапа */
	protected override _onPopoverOpen(): void {
		this._mountList();
	}

	/** Hook: демонтировать список при закрытии попапа */
	protected override _onPopoverClose(): void {
		this._unmountList();
	}

	// ========================================================================
	// Приватные методы
	// ========================================================================

	/** Настроить делегирование кликов (один раз, на popoverWrapper) */
	private _setupListListeners(): void {
		this._listElement.className = 'stk-dropdown-list';

		// Делегирование на popoverWrapper — стабильный элемент
		this.popoverWrapper.addEventListener('mousedown', (event) => {
			event.preventDefault();

			const target = (event.target as HTMLElement).closest<HTMLElement>('.stk-dropdown-item');
			if (!target || target.classList.contains('stk-dropdown-item_disabled')) return;

			const index = Number(target.dataset.index);
			const filteredItems = this._stateManager.get('filteredItems');
			const item = filteredItems[index];

			if (item) {
				this._selectItem(item);
				this.close();
			}
		});
	}

	/** Вставить список в DOM и отрендерить */
	private _mountList(): void {
		this.popoverWrapper.appendChild(this._listElement);
		this._renderItems();
		this._scrollToFocusedItem();
	}

	/** Удалить список из DOM и очистить содержимое */
	private _unmountList(): void {
		this._listElement.innerHTML = '';
		this._listElement.remove();
	}

	/** Подписки на состояние, специфичные для Combobox */
	private _setupComboboxSubscriptions(): void {
		// При изменении filterText → пересчитать filteredItems
		this._stateManager.subscribe('filterText', (filterText) => {
			const items = this._stateManager.get('dataItems');
			const filtered = this._applyFilter(items, filterText);
			this._stateManager.set('filteredItems', filtered);
			this._stateManager.set('focusedIndex', -1);
			this.emit('filtering', filterText);
		});

		// При изменении filteredItems → перерендер (только если попап открыт)
		this._stateManager.subscribe('filteredItems', () => {
			if (this._stateManager.get('opened')) {
				this._renderItems();
			}
		});

		// При изменении selectedItem → обновить input и перерендер
		this._stateManager.subscribe('selectedItem', (selectedItem) => {
			this._rootElement.value = selectedItem?.text ?? '';
			if (this._stateManager.get('opened')) {
				this._renderItems();
			}
		});

		// При изменении focusedIndex → перерендер + скролл (только если попап открыт)
		this._stateManager.subscribe('focusedIndex', () => {
			if (this._stateManager.get('opened')) {
				this._renderItems();
				this._scrollToFocusedItem();
			}
		});

		// При изменении dataItems → перефильтровать
		this._stateManager.subscribe('dataItems', () => {
			const filterText = this._stateManager.get('filterText');
			const items = this._stateManager.get('dataItems');
			this._stateManager.set('filteredItems', this._applyFilter(items, filterText));
		});
	}

	/** Настроить обработку ввода текста */
	private _setupComboboxInput(): void {
		this._rootElement.addEventListener('input', () => {
			// Сбросить текущий выбор при вводе
			if (this._stateManager.get('selectedItem')) {
				this._stateManager.set('selectedItem', null);
			}

			if (this._debounceTimer) {
				clearTimeout(this._debounceTimer);
			}

			this._debounceTimer = setTimeout(
				() => {
					this._stateManager.set('filterText', this._rootElement.value);
					this._debounceTimer = null;
				},
				this._debounceMs
			);

			// Открыть попап при вводе, если закрыт
			if (!this._stateManager.get('opened')) {
				this.open();
			}
		});
	}

	/** Настроить keyboard-навигацию для Combobox */
	private _setupComboboxKeyboard(): void {
		this.root.addEventListener('keydown', (event) => {
			const filteredItems = this._stateManager.get('filteredItems');
			if (filteredItems.length === 0) return;

			const currentFocusedIndex = this._stateManager.get('focusedIndex');

			switch (event.key) {
				case 'ArrowDown': {
					event.preventDefault();
					if (!this._stateManager.get('opened')) {
						this.open();
						return;
					}
					const nextIndex = this._findNextEnabledIndex(currentFocusedIndex, 'down', filteredItems);
					this._stateManager.set('focusedIndex', nextIndex);
					break;
				}
				case 'ArrowUp': {
					event.preventDefault();
					if (!this._stateManager.get('opened')) {
						this.open();
						return;
					}
					const prevIndex = this._findNextEnabledIndex(currentFocusedIndex, 'up', filteredItems);
					this._stateManager.set('focusedIndex', prevIndex);
					break;
				}
				case 'Enter': {
					event.preventDefault();
					if (currentFocusedIndex >= 0 && currentFocusedIndex < filteredItems.length) {
						const item = filteredItems[currentFocusedIndex];
						if (item && !item.disabled) {
							this._selectItem(item);
							this.close();
						}
					}
					break;
				}
			}
		});
	}

	/** Выбрать элемент */
	private _selectItem(item: DropdownItem): void {
		this._stateManager.set('selectedItem', item);

		// Сбросить фильтр после выбора
		this._stateManager.set('filterText', '');
		const allItems = this._stateManager.get('dataItems');
		this._stateManager.set('filteredItems', [...allItems]);

		this.emit('change', item);
	}

	/** Применить фильтрацию */
	private _applyFilter(items: DropdownItem[], filterText: string): DropdownItem[] {
		if (!filterText || filterText.length < this._minFilterLength) {
			return [...items];
		}

		if (this._filterStrategy === 'none') {
			return [...items];
		}

		const normalizedFilter = filterText.toLowerCase();

		return items.filter((item) => {
			const normalizedText = item.text.toLowerCase();

			switch (this._filterStrategy) {
				case 'startsWith':
					return normalizedText.startsWith(normalizedFilter);
				case 'contains':
				default:
					return normalizedText.includes(normalizedFilter);
			}
		});
	}

	/** Найти следующий доступный индекс */
	private _findNextEnabledIndex(
		currentIndex: number,
		direction: 'up' | 'down',
		items: DropdownItem[],
	): number {
		const step = direction === 'down' ? 1 : -1;
		let nextIndex = currentIndex + step;

		while (nextIndex >= 0 && nextIndex < items.length) {
			if (!items[nextIndex].disabled) {
				return nextIndex;
			}
			nextIndex += step;
		}

		return currentIndex;
	}

	/** Прокрутить к элементу с фокусом */
	private _scrollToFocusedItem(): void {
		const focusedIndex = this._stateManager.get('focusedIndex');
		if (focusedIndex < 0) return;

		const focusedLi = this._listElement.children[focusedIndex] as HTMLElement | undefined;
		focusedLi?.scrollIntoView({ block: 'nearest' });
	}
}

