import './dropdown-component.css';
import { BaseComponent } from './base-component';
import type { DropdownComponentProps, DropdownEvents, DropdownItem, DropdownState } from './types';

/**
 * DropdownComponent — компонент выпадающего списка с одиночным выбором.
 * Инпут readonly — только отображает выбранное значение.
 *
 * @example
 * ```ts
 * const dropdown = new DropdownComponent({
 *   selector: '#my-input',
 *   items: [
 *     { value: 1, text: 'Элемент 1' },
 *     { value: 2, text: 'Элемент 2' },
 *   ],
 *   placeholder: 'Выберите...',
 * });
 *
 * dropdown.on('change', (item) => console.log(item));
 * ```
 */
export class DropdownComponent extends BaseComponent<DropdownState, DropdownEvents> {
	private readonly _listElement = document.createElement('ul');

	constructor(props: DropdownComponentProps) {
		const { selector, items, dataSource, placeholder, value } = props;

		if (items && dataSource) {
			throw new Error('[DropdownComponent]: передайте items ИЛИ dataSource, но не оба');
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
			},
		});

		// Инпут readonly — пользователь не может вводить текст
		this._rootElement.readOnly = true;

		if (placeholder) {
			this._rootElement.placeholder = placeholder;
		}

		// Если уже есть выбранный элемент — отобразить его текст
		if (initialSelected) {
			this._rootElement.value = initialSelected.text;
		}

		this._setupListListeners();
		this._setupDropdownSubscriptions();
		this._setupDropdownKeyboard();

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
	 * Сбрасывает текущий выбор, если выбранный элемент отсутствует в новом списке.
	 */
	public setItems(items: DropdownItem[]): void {
		this._stateManager.set('dataItems', [...items]);

		const currentSelected = this._stateManager.get('selectedItem');
		if (currentSelected && !items.some(x => x.value === currentSelected.value)) {
			this._stateManager.set('selectedItem', null);
			this.root.value = '';
		}
	}

	/** Рендер списка элементов внутри попапа */
	protected _renderItems(): void {
		const items = this._stateManager.get('dataItems');
		const selectedItem = this._stateManager.get('selectedItem');
		const focusedIndex = this._stateManager.get('focusedIndex');

		this._listElement.innerHTML = '';

		items.forEach((item, index) => {
			const li = document.createElement('li');
			li.className = 'stk-dropdown-item';
			li.textContent = item.text;
			li.dataset.value = String(item.value);
			li.dataset.index = String(index);

			// Модификаторы
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

		// Делегирование на popoverWrapper — стабильный элемент, не теряется при mount/unmount
		this.popoverWrapper.addEventListener('mousedown', (event) => {
			event.preventDefault();

			const target = (event.target as HTMLElement).closest<HTMLElement>('.stk-dropdown-item');
			if (!target || target.classList.contains('stk-dropdown-item_disabled')) return;

			const index = Number(target.dataset.index);
			const items = this._stateManager.get('dataItems');
			const item = items[index];

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

	/** Настроить подписки на состояние, специфичные для Dropdown */
	private _setupDropdownSubscriptions(): void {
		// При изменении dataItems → перерендер (только если попап открыт)
		this._stateManager.subscribe('dataItems', () => {
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

		// При изменении focusedIndex → перерендер (только если попап открыт)
		this._stateManager.subscribe('focusedIndex', () => {
			if (this._stateManager.get('opened')) {
				this._renderItems();
				this._scrollToFocusedItem();
			}
		});
	}

	/** Настроить keyboard-навигацию, специфичную для Dropdown */
	private _setupDropdownKeyboard(): void {
		this.root.addEventListener('keydown', (event) => {
			const items = this._stateManager.get('dataItems');
			const enabledItems = items.filter(x => !x.disabled);
			if (enabledItems.length === 0) return;

			const currentFocusedIndex = this._stateManager.get('focusedIndex');

			switch (event.key) {
				case 'ArrowDown': {
					event.preventDefault();
					if (!this._stateManager.get('opened')) {
						this.open();
						return;
					}
					const nextIndex = this._findNextEnabledIndex(currentFocusedIndex, 'down', items);
					this._stateManager.set('focusedIndex', nextIndex);
					break;
				}
				case 'ArrowUp': {
					event.preventDefault();
					if (!this._stateManager.get('opened')) {
						this.open();
						return;
					}
					const prevIndex = this._findNextEnabledIndex(currentFocusedIndex, 'up', items);
					this._stateManager.set('focusedIndex', prevIndex);
					break;
				}
				case ' ':
				case 'Enter': {
					event.preventDefault();
					if (currentFocusedIndex >= 0 && currentFocusedIndex < items.length) {
						const item = items[currentFocusedIndex];
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
		this.emit('change', item);
	}

	/** Найти следующий доступный (не disabled) индекс в списке */
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

	/** Прокрутить список к элементу с фокусом */
	private _scrollToFocusedItem(): void {
		const focusedIndex = this._stateManager.get('focusedIndex');
		if (focusedIndex < 0) return;

		const focusedLi = this._listElement.children[focusedIndex] as HTMLElement | undefined;
		focusedLi?.scrollIntoView({ block: 'nearest' });
	}
}
