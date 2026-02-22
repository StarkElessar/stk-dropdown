import './multiselect-component.css';
import { BaseComponent } from './base-component';
import type {
	DropdownItem,
	MultiselectComponentProps,
	MultiselectEvents,
	MultiselectState,
	TagMode
} from './types';
import { SELECT_ALL_VALUE } from './types';

/**
 * MultiselectComponent — компонент множественного выбора с тегами-чипами и чекбоксами.
 * Попап не закрывается после выбора элемента.
 * Backspace в инпуте удаляет последний выбранный элемент.
 *
 * @example
 * ```ts
 * const multiselect = new MultiselectComponent({
 *   selector: '#my-input',
 *   items: [
 *     { value: 1, text: 'Красный' },
 *     { value: 2, text: 'Синий' },
 *     { value: 3, text: 'Зелёный' },
 *   ],
 *   showSelectAll: true,
 *   placeholder: 'Выберите цвета...',
 * });
 *
 * multiselect.on('change', (items) => console.log(items));
 * ```
 */
export class MultiselectComponent extends BaseComponent<MultiselectState, MultiselectEvents> {
	private readonly _listElement = document.createElement('ul');
	private readonly _tagsContainer = document.createElement('span');
	private readonly _showSelectAll: boolean;
	private readonly _maxSelectedItems: number;
	private readonly _tagMode: TagMode;

	constructor(props: MultiselectComponentProps) {
		const {
			selector,
			items,
			placeholder,
			values,
			showSelectAll,
			maxSelectedItems,
			tagMode
		} = props;

		// Определить начально выбранные элементы
		const initialSelected = values
			? items.filter((item) => values.includes(item.value))
			: [];

		const allSelected = initialSelected.length === items.length && items.length > 0;

		super({
			selector,
			state: {
				opened: false,
				disabled: false,
				dataItems: [...items],
				selectedItems: initialSelected,
				filterText: '',
				filteredItems: [...items],
				allSelected,
				focusedIndex: -1
			}
		});

		this._showSelectAll = showSelectAll ?? false;
		this._maxSelectedItems = maxSelectedItems ?? Infinity;
		this._tagMode = tagMode ?? 'multiple';

		if (placeholder) {
			this._rootElement.placeholder = placeholder;
		}

		this._initMultiselectDOM();
		this._initList();
		this._setupMultiselectSubscriptions();
		this._setupMultiselectInput();
		this._setupMultiselectKeyboard();

		// Первый рендер тегов
		this._renderTags();
	}

	/**
	 * Геттер/сеттер выбранных элементов.
	 * - Без аргументов: возвращает массив выбранных элементов.
	 * - С аргументом `[-1]`: выбирает все элементы.
	 * - С пустым массивом `[]`: снимает выделение со всех.
	 * - С массивом value: выбирает указанные элементы.
	 */
	public value(): DropdownItem[];
	public value(values: (string | number)[]): void;
	public value(values?: (string | number)[]): DropdownItem[] | void {
		if (values === undefined) {
			return [...this._stateManager.get('selectedItems')];
		}

		const items = this._stateManager.get('dataItems');

		// [-1] → выбрать все
		if (values.length === 1 && values[0] === SELECT_ALL_VALUE) {
			const enabledItems = items.filter((i) => !i.disabled);
			this._stateManager.set('selectedItems', enabledItems);
			this._stateManager.set('allSelected', true);
			this.emit('change', enabledItems);
			return;
		}

		// [] → снять все
		if (values.length === 0) {
			this._stateManager.set('selectedItems', []);
			this._stateManager.set('allSelected', false);
			this.emit('change', []);
			return;
		}

		// Выбрать по values
		const selected = items.filter((item) => values.includes(item.value) && !item.disabled);
		this._stateManager.set('selectedItems', selected);
		this._updateAllSelectedState();
		this.emit('change', selected);
	}

	/**
	 * Обновить список элементов.
	 * Убирает из выбранных те, которых нет в новом списке.
	 */
	public setItems(items: DropdownItem[]): void {
		this._stateManager.set('dataItems', [...items]);

		// Пересечение: оставить только те, что есть в новом списке
		const currentSelected = this._stateManager.get('selectedItems');
		const newSelected = currentSelected.filter((sel) =>
			items.some((i) => i.value === sel.value)
		);
		this._stateManager.set('selectedItems', newSelected);

		// Перефильтровать
		const filterText = this._stateManager.get('filterText');
		this._stateManager.set('filteredItems', this._applyFilter(items, filterText));
		this._updateAllSelectedState();
	}

	/** Рендер списка элементов с чекбоксами */
	protected _renderItems(): void {
		const filteredItems = this._stateManager.get('filteredItems');
		const selectedItems = this._stateManager.get('selectedItems');
		const allSelected = this._stateManager.get('allSelected');
		const focusedIndex = this._stateManager.get('focusedIndex');

		const selectedValues = new Set(selectedItems.map(x => x.value));

		this._listElement.innerHTML = '';

		// Элемент "Выбрать все"
		if (this._showSelectAll) {
			const selectAllLi = document.createElement('li');
			selectAllLi.className = 'stk-dropdown-item stk-multiselect-item_select-all';
			selectAllLi.dataset.value = String(SELECT_ALL_VALUE);
			selectAllLi.dataset.index = String(-1);

			if (focusedIndex === -1 && this._stateManager.get('opened')) {
				// "Все" не получает фокус по умолчанию, только при навигации
			}

			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.checked = allSelected;
			checkbox.tabIndex = -1;

			const label = document.createElement('span');
			label.textContent = 'Выбрать все';

			selectAllLi.appendChild(checkbox);
			selectAllLi.appendChild(label);
			this._listElement.appendChild(selectAllLi);
		}

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
			li.dataset.value = String(item.value);
			li.dataset.index = String(index);

			const isSelected = selectedValues.has(item.value);

			if (isSelected) {
				li.classList.add('stk-dropdown-item_selected');
			}
			if (index === focusedIndex) {
				li.classList.add('stk-dropdown-item_focused');
			}
			if (item.disabled) {
				li.classList.add('stk-dropdown-item_disabled');
			}

			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.checked = isSelected;
			checkbox.tabIndex = -1;

			const label = document.createElement('span');
			label.textContent = item.text;

			li.appendChild(checkbox);
			li.appendChild(label);
			this._listElement.appendChild(li);
		});
	}

	/** Инициализация специфичной DOM-структуры для multiselect */
	private _initMultiselectDOM(): void {
		this.wrapper.classList.add('stk-multiselect-wrapper');
		this._tagsContainer.className = 'stk-multiselect-tags';

		// Вставляем tags-контейнер перед input внутри wrapper
		this.wrapper.insertBefore(this._tagsContainer, this.root);
	}

	/** Инициализация списка */
	private _initList(): void {
		this._listElement.className = 'stk-dropdown-list stk-multiselect-list';
		this.popoverWrapper.appendChild(this._listElement);

		// Делегирование кликов
		this._listElement.addEventListener('mousedown', (event) => {
			event.preventDefault();

			const target = (event.target as HTMLElement).closest<HTMLElement>('.stk-dropdown-item');

			if (target?.classList.contains('stk-dropdown-item_disabled')) {
				const value = target.dataset.value;
				if (value === undefined) {
					return;
				}

				// "Выбрать все"
				if (Number(value) === SELECT_ALL_VALUE) {
					this._toggleSelectAll();
					return;
				}

				const index = Number(target.dataset.index);
				const filteredItems = this._stateManager.get('filteredItems');
				const item = filteredItems[index];

				if (item) {
					this._toggleItem(item);
				}
			}
		});

		this._renderItems();
	}

	/** Подписки на состояние, специфичные для Multiselect */
	private _setupMultiselectSubscriptions(): void {
		// filterText → пересчитать filteredItems
		this._stateManager.subscribe('filterText', (filterText) => {
			const items = this._stateManager.get('dataItems');
			this._stateManager.set('filteredItems', this._applyFilter(items, filterText));
			this._stateManager.set('focusedIndex', -1);
		});

		// filteredItems → перерендер
		this._stateManager.subscribe('filteredItems', () => {
			this._renderItems();
		});

		// selectedItems → перерендер тегов и списка
		this._stateManager.subscribe('selectedItems', () => {
			this._renderTags();
			this._renderItems();
			this._updateAllSelectedState();
		});

		// allSelected → перерендер
		this._stateManager.subscribe('allSelected', () => {
			this._renderItems();
		});

		// focusedIndex → перерендер + скролл
		this._stateManager.subscribe('focusedIndex', () => {
			this._renderItems();
			this._scrollToFocusedItem();
		});

		// dataItems → перефильтровать
		this._stateManager.subscribe('dataItems', () => {
			const filterText = this._stateManager.get('filterText');
			const items = this._stateManager.get('dataItems');
			this._stateManager.set('filteredItems', this._applyFilter(items, filterText));
		});
	}

	/** Настроить обработку ввода текста (фильтрация) */
	private _setupMultiselectInput(): void {
		let debounceTimer: ReturnType<typeof setTimeout> | null = null;

		this.root.addEventListener('input', () => {
			if (debounceTimer) {
				clearTimeout(debounceTimer);
			}

			debounceTimer = setTimeout(
				() => {
					this._stateManager.set('filterText', this.root.value);
					debounceTimer = null;
				},
				150
			);

			if (!this._stateManager.get('opened')) {
				this.open();
			}
		});
	}

	/** Настроить keyboard-навигацию для Multiselect */
	private _setupMultiselectKeyboard(): void {
		this._rootElement.addEventListener('keydown', (event) => {
			const filteredItems = this._stateManager.get('filteredItems');
			const currentFocusedIndex = this._stateManager.get('focusedIndex');

			switch (event.key) {
				case 'Backspace': {
					// Если инпут пустой — удалить последний выбранный элемент
					if (this._rootElement.value === '') {
						const selectedItems = this._stateManager.get('selectedItems');
						if (selectedItems.length > 0) {
							const lastItem = selectedItems[selectedItems.length - 1];
							this._toggleItem(lastItem);
						}
					}
					break;
				}
				case 'ArrowDown': {
					event.preventDefault();
					if (!this._stateManager.get('opened')) {
						this.open();
						return;
					}
					if (filteredItems.length === 0) {
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
					if (filteredItems.length === 0) {
						return;
					}
					const prevIndex = this._findNextEnabledIndex(currentFocusedIndex, 'up', filteredItems);
					this._stateManager.set('focusedIndex', prevIndex);
					break;
				}
				case ' ':
				case 'Enter': {
					event.preventDefault();
					if (currentFocusedIndex >= 0 && currentFocusedIndex < filteredItems.length) {
						const item = filteredItems[currentFocusedIndex];
						if (item && !item.disabled) {
							this._toggleItem(item);
						}
					}
					break;
				}
			}
		});
	}

	/** Toggle выбора элемента */
	private _toggleItem(item: DropdownItem): void {
		const selectedItems = this._stateManager.get('selectedItems');
		const isSelected = selectedItems.some((i) => i.value === item.value);

		let newSelected: DropdownItem[];

		if (isSelected) {
			// Снять выделение
			newSelected = selectedItems.filter((i) => i.value !== item.value);
		}
		else {
			// Добавить, если не превышен лимит
			if (selectedItems.length >= this._maxSelectedItems) {
				return;
			}
			newSelected = [...selectedItems, item];
		}

		this._stateManager.set('selectedItems', newSelected);
		this.emit('change', newSelected);
	}

	/** Toggle "Выбрать все" */
	private _toggleSelectAll(): void {
		const allSelected = this._stateManager.get('allSelected');

		if (allSelected) {
			// Снять всё
			this._stateManager.set('selectedItems', []);
			this._stateManager.set('allSelected', false);
			this.emit('change', []);
		}
		else {
			// Выбрать все (только enabled)
			const items = this._stateManager.get('dataItems');
			const enabledItems = items.filter(x => !x.disabled);
			this._stateManager.set('selectedItems', enabledItems);
			this._stateManager.set('allSelected', true);
			this.emit('change', enabledItems);
		}
	}

	/** Обновить флаг allSelected на основе текущего состояния */
	private _updateAllSelectedState(): void {
		const items = this._stateManager.get('dataItems');
		const selectedItems = this._stateManager.get('selectedItems');
		const enabledItems = items.filter(x => !x.disabled);
		const newAllSelected = enabledItems.length > 0 && selectedItems.length === enabledItems.length;
		this._stateManager.set('allSelected', newAllSelected);
	}

	/** Отрисовать теги-чипы выбранных элементов */
	private _renderTags(): void {
		const selectedItems = this._stateManager.get('selectedItems');
		this._tagsContainer.innerHTML = '';

		if (selectedItems.length === 0) {
			this._tagsContainer.style.display = 'none';
			return;
		}

		this._tagsContainer.style.display = 'inline-flex';

		if (this._tagMode === 'single') {
			// Один суммарный тег
			const tag = this._createTag(`Выбрано: ${selectedItems.length}`);
			tag.querySelector('.stk-multiselect-tag__remove')?.addEventListener('mousedown', (event) => {
				event.preventDefault();
				event.stopPropagation();
				this._stateManager.set('selectedItems', []);
				this._stateManager.set('allSelected', false);
				this.emit('change', []);
			});
			this._tagsContainer.appendChild(tag);
		}
		else {
			// Отдельный тег для каждого элемента
			selectedItems.forEach((item) => {
				const tag = this._createTag(item.text);
				tag.querySelector('.stk-multiselect-tag__remove')?.addEventListener('mousedown', (event) => {
					event.preventDefault();
					event.stopPropagation();
					this._toggleItem(item);
				});
				this._tagsContainer.appendChild(tag);
			});
		}
	}

	/** Создать DOM-элемент тега */
	private _createTag(text: string): HTMLElement {
		const tag = document.createElement('span');
		tag.className = 'stk-multiselect-tag';

		const label = document.createElement('span');
		label.className = 'stk-multiselect-tag__text';
		label.textContent = text;

		const removeBtn = document.createElement('button');
		removeBtn.className = 'stk-multiselect-tag__remove';
		removeBtn.type = 'button';
		removeBtn.tabIndex = -1;
		removeBtn.innerHTML = '×';

		tag.appendChild(label);
		tag.appendChild(removeBtn);

		return tag;
	}

	/** Применить фильтрацию */
	private _applyFilter(items: DropdownItem[], filterText: string): DropdownItem[] {
		if (filterText) {
			const normalized = filterText.toLowerCase();
			return items.filter((item) => item.text.toLowerCase().includes(normalized));
		}

		return [...items];
	}

	/** Найти следующий доступный индекс */
	private _findNextEnabledIndex(
		currentIndex: number,
		direction: 'up' | 'down',
		items: DropdownItem[]
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
		if (focusedIndex < 0) {
			return;
		}

		// Учитываем "Выбрать все" — он занимает первый child
		const offset = this._showSelectAll ? 1 : 0;
		const focusedLi = this._listElement.children[focusedIndex + offset];
		focusedLi?.scrollIntoView({ block: 'nearest' });
	}
}

