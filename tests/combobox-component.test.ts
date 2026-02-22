import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ComboboxComponent } from '../src/lib/combobox-component';
import type { DropdownItem } from '../src/lib/types';

const ITEMS: DropdownItem[] = [
	{ value: 1, text: 'Москва' },
	{ value: 2, text: 'Минск' },
	{ value: 3, text: 'Санкт-Петербург' },
	{ value: 4, text: 'Новосибирск' },
	{ value: 5, text: 'Самара', disabled: true },
];

function createInput(): HTMLInputElement {
	const input = document.createElement('input');
	input.type = 'text';
	input.id = 'combobox-test';
	document.body.appendChild(input);
	return input;
}

describe('ComboboxComponent', () => {
	let input: HTMLInputElement;

	beforeEach(() => {
		input = createInput();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		document.body.innerHTML = '';
		document.querySelector('#stk-dropdown-portal')?.remove();
	});

	// ========================================================================
	// Инициализация
	// ========================================================================
	describe('инициализация', () => {
		it('должен создавать компонент', () => {
			const combobox = new ComboboxComponent({
				selector: input,
				items: ITEMS,
			});

			expect(combobox).toBeDefined();
			expect(combobox.root).toBe(input);
		});

		it('input НЕ должен быть readonly', () => {
			new ComboboxComponent({
				selector: input,
				items: ITEMS,
			});

			expect(input.readOnly).toBe(false);
		});

		it('должен устанавливать placeholder', () => {
			new ComboboxComponent({
				selector: input,
				items: ITEMS,
				placeholder: 'Город...',
			});

			expect(input.placeholder).toBe('Город...');
		});

		it('должен устанавливать начальное значение по value', () => {
			new ComboboxComponent({
				selector: input,
				items: ITEMS,
				value: 3,
			});

			expect(input.value).toBe('Санкт-Петербург');
		});

		it('должен отрисовать все элементы по умолчанию', () => {
			const combobox = new ComboboxComponent({
				selector: input,
				items: ITEMS,
			});

			const listItems = combobox.popoverWrapper.querySelectorAll('.stk-dropdown-item');
			expect(listItems.length).toBe(ITEMS.length);
		});
	});

	// ========================================================================
	// value()
	// ========================================================================
	describe('value()', () => {
		it('value() возвращает null если ничего не выбрано', () => {
			const combobox = new ComboboxComponent({
				selector: input,
				items: ITEMS,
			});

			expect(combobox.value()).toBeNull();
		});

		it('value(val) программно выбирает элемент', () => {
			const combobox = new ComboboxComponent({
				selector: input,
				items: ITEMS,
			});
			const handler = vi.fn();
			combobox.on('change', handler);

			combobox.value(1);

			expect(input.value).toBe('Москва');
			expect(combobox.value()).toEqual({ value: 1, text: 'Москва' });
			expect(handler).toHaveBeenCalledOnce();
		});

		it('value() не выбирает disabled элемент', () => {
			const combobox = new ComboboxComponent({
				selector: input,
				items: ITEMS,
			});

			combobox.value(5); // disabled

			expect(combobox.value()).toBeNull();
		});
	});

	// ========================================================================
	// Фильтрация
	// ========================================================================
	describe('фильтрация', () => {
		it('filter() программно фильтрует список (contains)', () => {
			const combobox = new ComboboxComponent({
				selector: input,
				items: ITEMS,
				filter: 'contains',
			});

			combobox.filter('м');

			const listItems = combobox.popoverWrapper.querySelectorAll('.stk-dropdown-item');
			// "Москва", "Минск", "Самара" содержат "м" (регистронезависимо)
			expect(listItems.length).toBe(3);
		});

		it('фильтрация startsWith', () => {
			const combobox = new ComboboxComponent({
				selector: input,
				items: ITEMS,
				filter: 'startsWith',
			});

			combobox.filter('м');

			const listItems = combobox.popoverWrapper.querySelectorAll('.stk-dropdown-item');
			// "Москва", "Минск" начинаются на "м"
			expect(listItems.length).toBe(2);
		});

		it('фильтрация none не фильтрует', () => {
			const combobox = new ComboboxComponent({
				selector: input,
				items: ITEMS,
				filter: 'none',
			});

			combobox.filter('xyz');

			const listItems = combobox.popoverWrapper.querySelectorAll('.stk-dropdown-item');
			expect(listItems.length).toBe(ITEMS.length);
		});

		it('показывает "Ничего не найдено" если фильтр не дал результатов', () => {
			const combobox = new ComboboxComponent({
				selector: input,
				items: ITEMS,
				filter: 'contains',
			});

			combobox.filter('xyzнесуществующий');

			const noResults = combobox.popoverWrapper.querySelector('.stk-dropdown-no-results');
			expect(noResults).toBeTruthy();
			expect(noResults?.textContent).toBe('Ничего не найдено');
		});

		it('должен эмитить событие filtering', () => {
			const combobox = new ComboboxComponent({
				selector: input,
				items: ITEMS,
			});
			const handler = vi.fn();
			combobox.on('filtering', handler);

			combobox.filter('мо');

			expect(handler).toHaveBeenCalledWith('мо');
		});

		it('ввод в input должен фильтровать с debounce', () => {
			const combobox = new ComboboxComponent({
				selector: input,
				items: ITEMS,
				filter: 'contains',
				debounce: 200,
			});

			combobox.open();
			input.value = 'мос';
			input.dispatchEvent(new Event('input', { bubbles: true }));

			// До debounce — всё ещё все элементы
			let listItems = combobox.popoverWrapper.querySelectorAll('.stk-dropdown-item');
			expect(listItems.length).toBe(ITEMS.length);

			// После debounce
			vi.advanceTimersByTime(200);
			listItems = combobox.popoverWrapper.querySelectorAll('.stk-dropdown-item');
			expect(listItems.length).toBe(1);
			expect(listItems[0].textContent).toBe('Москва');
		});

		it('minFilterLength — не фильтрует если текст короче', () => {
			const combobox = new ComboboxComponent({
				selector: input,
				items: ITEMS,
				filter: 'contains',
				minFilterLength: 3,
			});

			combobox.filter('мо'); // 2 символа < 3

			const listItems = combobox.popoverWrapper.querySelectorAll('.stk-dropdown-item');
			expect(listItems.length).toBe(ITEMS.length);
		});
	});

	// ========================================================================
	// setItems()
	// ========================================================================
	describe('setItems()', () => {
		it('должен обновлять список и перефильтровывать', () => {
			const combobox = new ComboboxComponent({
				selector: input,
				items: ITEMS,
				filter: 'contains',
			});

			combobox.filter('аст');
			const newItems: DropdownItem[] = [
				{ value: 10, text: 'Астана' },
				{ value: 20, text: 'Баку' },
			];
			combobox.setItems(newItems);

			// Фильтр "аст" должен применяться: "Астана" подходит, "Баку" нет
			const listItems = combobox.popoverWrapper.querySelectorAll('.stk-dropdown-item');
			expect(listItems.length).toBe(1);
			expect(listItems[0].textContent).toBe('Астана');
		});
	});

	// ========================================================================
	// Keyboard
	// ========================================================================
	describe('keyboard', () => {
		it('ArrowDown + Enter выбирает элемент', () => {
			const combobox = new ComboboxComponent({
				selector: input,
				items: ITEMS,
			});
			const handler = vi.fn();
			combobox.on('change', handler);

			combobox.open();
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

			expect(handler).toHaveBeenCalledWith({ value: 2, text: 'Минск' });
			expect(input.value).toBe('Минск');
		});

		it('после выбора фильтр сбрасывается', () => {
			const combobox = new ComboboxComponent({
				selector: input,
				items: ITEMS,
				filter: 'contains',
			});

			combobox.filter('мос');
			combobox.open();
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

			// После выбора все items должны быть доступны
			const listItems = combobox.popoverWrapper.querySelectorAll('.stk-dropdown-item');
			expect(listItems.length).toBe(ITEMS.length);
		});
	});
});

