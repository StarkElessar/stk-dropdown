import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DropdownComponent } from '../src/lib/dropdown-component';
import type { DropdownItem } from '../src/lib/types';

const ITEMS: DropdownItem[] = [
	{ value: 1, text: 'Яблоко' },
	{ value: 2, text: 'Апельсин' },
	{ value: 3, text: 'Банан' },
	{ value: 4, text: 'Виноград', disabled: true },
	{ value: 5, text: 'Манго' },
];

function createInput(): HTMLInputElement {
	const input = document.createElement('input');
	input.type = 'text';
	input.id = 'dropdown-test';
	document.body.appendChild(input);
	return input;
}

describe('DropdownComponent', () => {
	let input: HTMLInputElement;

	beforeEach(() => {
		input = createInput();
	});

	afterEach(() => {
		document.body.innerHTML = '';
		document.querySelector('#stk-dropdown-portal')?.remove();
	});

	// ========================================================================
	// Инициализация
	// ========================================================================
	describe('инициализация', () => {
		it('должен создавать компонент с items', () => {
			const dropdown = new DropdownComponent({
				selector: input,
				items: ITEMS,
			});

			expect(dropdown).toBeDefined();
			expect(dropdown.root).toBe(input);
		});

		it('должен устанавливать placeholder', () => {
			new DropdownComponent({
				selector: input,
				items: ITEMS,
				placeholder: 'Выберите...',
			});

			expect(input.placeholder).toBe('Выберите...');
		});

		it('input должен быть readonly', () => {
			new DropdownComponent({
				selector: input,
				items: ITEMS,
			});

			expect(input.readOnly).toBe(true);
		});

		it('должен устанавливать начальное значение по value', () => {
			new DropdownComponent({
				selector: input,
				items: ITEMS,
				value: 2,
			});

			expect(input.value).toBe('Апельсин');
		});

		it('если value не найден — input пуст', () => {
			new DropdownComponent({
				selector: input,
				items: ITEMS,
				value: 999,
			});

			expect(input.value).toBe('');
		});
	});

	// ========================================================================
	// Рендеринг списка
	// ========================================================================
	describe('рендеринг', () => {
		it('должен отрисовать все элементы списка', () => {
			const dropdown = new DropdownComponent({
				selector: input,
				items: ITEMS,
			});

			dropdown.open();
			const listItems = dropdown.popoverWrapper.querySelectorAll('.stk-dropdown-item');
			expect(listItems.length).toBe(ITEMS.length);
		});

		it('disabled элемент должен иметь класс _disabled', () => {
			const dropdown = new DropdownComponent({
				selector: input,
				items: ITEMS,
			});

			dropdown.open();
			const listItems = dropdown.popoverWrapper.querySelectorAll('.stk-dropdown-item');
			// 4-й элемент (index 3) — disabled
			expect(listItems[3].classList.contains('stk-dropdown-item_disabled')).toBe(true);
		});

		it('выбранный элемент должен иметь класс _selected', () => {
			const dropdown = new DropdownComponent({
				selector: input,
				items: ITEMS,
				value: 1,
			});

			dropdown.open();
			const listItems = dropdown.popoverWrapper.querySelectorAll('.stk-dropdown-item');
			expect(listItems[0].classList.contains('stk-dropdown-item_selected')).toBe(true);
		});
	});

	// ========================================================================
	// value()
	// ========================================================================
	describe('value()', () => {
		it('value() без аргументов должен возвращать null если ничего не выбрано', () => {
			const dropdown = new DropdownComponent({
				selector: input,
				items: ITEMS,
			});

			expect(dropdown.value()).toBeNull();
		});

		it('value() должен возвращать выбранный элемент', () => {
			const dropdown = new DropdownComponent({
				selector: input,
				items: ITEMS,
				value: 3,
			});

			const selected = dropdown.value();
			expect(selected).toEqual({ value: 3, text: 'Банан' });
		});

		it('value(val) должен программно выбирать элемент', () => {
			const dropdown = new DropdownComponent({
				selector: input,
				items: ITEMS,
			});
			const handler = vi.fn();
			dropdown.on('change', handler);

			dropdown.value(2);

			expect(input.value).toBe('Апельсин');
			expect(dropdown.value()).toEqual({ value: 2, text: 'Апельсин' });
			expect(handler).toHaveBeenCalledOnce();
		});

		it('value() не должен выбирать disabled элемент', () => {
			const dropdown = new DropdownComponent({
				selector: input,
				items: ITEMS,
			});
			const handler = vi.fn();
			dropdown.on('change', handler);

			dropdown.value(4); // disabled

			expect(dropdown.value()).toBeNull();
			expect(handler).not.toHaveBeenCalled();
		});
	});

	// ========================================================================
	// setItems()
	// ========================================================================
	describe('setItems()', () => {
		it('должен обновлять список элементов', () => {
			const dropdown = new DropdownComponent({
				selector: input,
				items: ITEMS,
			});

			const newItems: DropdownItem[] = [
				{ value: 10, text: 'Новый 1' },
				{ value: 20, text: 'Новый 2' },
			];

			dropdown.setItems(newItems);
			dropdown.open();

			const listItems = dropdown.popoverWrapper.querySelectorAll('.stk-dropdown-item');
			expect(listItems.length).toBe(2);
			expect(listItems[0].textContent).toBe('Новый 1');
		});

		it('должен сбрасывать выбор, если выбранный элемент отсутствует в новом списке', () => {
			const dropdown = new DropdownComponent({
				selector: input,
				items: ITEMS,
				value: 1,
			});

			dropdown.setItems([{ value: 10, text: 'Другой' }]);

			expect(dropdown.value()).toBeNull();
			expect(input.value).toBe('');
		});

		it('не должен сбрасывать выбор, если элемент есть в новом списке', () => {
			const dropdown = new DropdownComponent({
				selector: input,
				items: ITEMS,
				value: 1,
			});

			dropdown.setItems([
				{ value: 1, text: 'Яблоко' },
				{ value: 10, text: 'Другой' },
			]);

			expect(dropdown.value()?.value).toBe(1);
		});
	});

	// ========================================================================
	// События
	// ========================================================================
	describe('события', () => {
		it('должен эмитить change при выборе', () => {
			const dropdown = new DropdownComponent({
				selector: input,
				items: ITEMS,
			});
			const handler = vi.fn();

			dropdown.on('change', handler);
			dropdown.value(1);

			expect(handler).toHaveBeenCalledWith({ value: 1, text: 'Яблоко' });
		});

		it('должен эмитить open/close', () => {
			const dropdown = new DropdownComponent({
				selector: input,
				items: ITEMS,
			});
			const openHandler = vi.fn();
			const closeHandler = vi.fn();

			dropdown.on('open', openHandler);
			dropdown.on('close', closeHandler);

			dropdown.open();
			expect(openHandler).toHaveBeenCalledOnce();

			dropdown.close();
			expect(closeHandler).toHaveBeenCalledOnce();
		});
	});

	// ========================================================================
	// Keyboard-навигация
	// ========================================================================
	describe('keyboard', () => {
		it('ArrowDown должен открывать попап, если закрыт', () => {
			const dropdown = new DropdownComponent({
				selector: input,
				items: ITEMS,
			});

			dropdown.close();
			const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
			input.dispatchEvent(event);

			expect(dropdown.popoverWrapper.style.display).toBe('block');
		});

		it('ArrowDown должен перемещать фокус по списку', () => {
			const dropdown = new DropdownComponent({
				selector: input,
				items: ITEMS,
			});

			dropdown.open();

			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
			const focused = dropdown.popoverWrapper.querySelector('.stk-dropdown-item_focused');
			expect(focused?.textContent).toBe('Яблоко');
		});

		it('ArrowDown должен пропускать disabled элементы', () => {
			const dropdown = new DropdownComponent({
				selector: input,
				items: ITEMS,
			});

			dropdown.open();

			// Move to index 0 (Яблоко)
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
			// Move to index 1 (Апельсин)
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
			// Move to index 2 (Банан)
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
			// index 3 disabled (Виноград), should skip to index 4 (Манго)
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

			const focused = dropdown.popoverWrapper.querySelector('.stk-dropdown-item_focused');
			expect(focused?.textContent).toBe('Манго');
		});

		it('Enter должен выбирать сфокусированный элемент', () => {
			const dropdown = new DropdownComponent({
				selector: input,
				items: ITEMS,
			});
			const handler = vi.fn();
			dropdown.on('change', handler);

			dropdown.open();
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

			expect(handler).toHaveBeenCalledWith({ value: 1, text: 'Яблоко' });
			expect(input.value).toBe('Яблоко');
		});

		it('mousedown на элементе списка должен выбирать его', () => {
			const dropdown = new DropdownComponent({
				selector: input,
				items: ITEMS,
			});
			const handler = vi.fn();
			dropdown.on('change', handler);

			dropdown.open();

			const listItems = dropdown.popoverWrapper.querySelectorAll<HTMLElement>('.stk-dropdown-item');
			// Кликаем по "Апельсин" (index 1)
			listItems[1].dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));

			expect(handler).toHaveBeenCalledWith({ value: 2, text: 'Апельсин' });
			expect(input.value).toBe('Апельсин');
			// Попап должен закрыться
			expect(dropdown.popoverWrapper.style.display).toBe('none');
		});

		it('mousedown на disabled элементе НЕ должен выбирать его', () => {
			const dropdown = new DropdownComponent({
				selector: input,
				items: ITEMS,
			});
			const handler = vi.fn();
			dropdown.on('change', handler);

			dropdown.open();

			const listItems = dropdown.popoverWrapper.querySelectorAll<HTMLElement>('.stk-dropdown-item');
			// Виноград (index 3) — disabled
			listItems[3].dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));

			expect(handler).not.toHaveBeenCalled();
			expect(dropdown.value()).toBeNull();
		});

		it('повторный клик на input после выбора элемента должен снова открывать попап', () => {
			// Регрессионный тест: после выбора фокус остаётся на input,
			// поэтому focus-событие не повторяется — должен работать mousedown.
			const dropdown = new DropdownComponent({
				selector: input,
				items: ITEMS,
			});

			// Открываем и выбираем элемент
			dropdown.open();
			const listItems = dropdown.popoverWrapper.querySelectorAll<HTMLElement>('.stk-dropdown-item');
			listItems[0].dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));

			// Попап закрылся после выбора
			expect(dropdown.popoverWrapper.style.display).toBe('none');
			expect(dropdown.value()?.text).toBe('Яблоко');

			// Клик на input снова — фокус уже есть, поэтому нужен mousedown
			input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));

			// Попап должен открыться снова
			expect(dropdown.popoverWrapper.style.display).toBe('block');
		});
	});
});

