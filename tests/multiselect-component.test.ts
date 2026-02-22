import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MultiselectComponent } from '../src/lib/multiselect-component';
import type { DropdownItem } from '../src/lib/types';

const ITEMS: DropdownItem[] = [
	{ value: 'red', text: 'Красный' },
	{ value: 'blue', text: 'Синий' },
	{ value: 'green', text: 'Зелёный' },
	{ value: 'black', text: 'Чёрный', disabled: true },
	{ value: 'white', text: 'Белый' },
];

function createInput(): HTMLInputElement {
	const input = document.createElement('input');
	input.type = 'text';
	input.id = 'multiselect-test';
	document.body.appendChild(input);
	return input;
}

describe('MultiselectComponent', () => {
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
		it('должен создавать компонент', () => {
			const ms = new MultiselectComponent({
				selector: input,
				items: ITEMS,
			});

			expect(ms).toBeDefined();
		});

		it('должен добавлять класс stk-multiselect-wrapper', () => {
			const ms = new MultiselectComponent({
				selector: input,
				items: ITEMS,
			});

			expect(ms.wrapper.classList.contains('stk-multiselect-wrapper')).toBe(true);
		});

		it('должен содержать контейнер тегов', () => {
			const ms = new MultiselectComponent({
				selector: input,
				items: ITEMS,
			});

			const tags = ms.wrapper.querySelector('.stk-multiselect-tags');
			expect(tags).toBeTruthy();
		});

		it('должен устанавливать начальные выбранные элементы', () => {
			const ms = new MultiselectComponent({
				selector: input,
				items: ITEMS,
				values: ['red', 'blue'],
			});

			const selected = ms.value();
			expect(selected.length).toBe(2);
			expect(selected[0].value).toBe('red');
			expect(selected[1].value).toBe('blue');
		});

		it('должен отрисовать теги для начально выбранных элементов', () => {
			const ms = new MultiselectComponent({
				selector: input,
				items: ITEMS,
				values: ['red', 'green'],
			});

			const tags = ms.wrapper.querySelectorAll('.stk-multiselect-tag');
			expect(tags.length).toBe(2);
		});
	});

	// ========================================================================
	// Рендеринг списка
	// ========================================================================
	describe('рендеринг', () => {
		it('должен отрисовать все элементы с чекбоксами', () => {
			const ms = new MultiselectComponent({
				selector: input,
				items: ITEMS,
			});

			ms.open();
			const listItems = ms.popoverWrapper.querySelectorAll('.stk-dropdown-item');
			expect(listItems.length).toBe(ITEMS.length);

			// Каждый элемент должен содержать checkbox
			listItems.forEach((li) => {
				expect(li.querySelector('input[type="checkbox"]')).toBeTruthy();
			});
		});

		it('должен отображать "Выбрать все" если showSelectAll', () => {
			const ms = new MultiselectComponent({
				selector: input,
				items: ITEMS,
				showSelectAll: true,
			});

			ms.open();
			const selectAll = ms.popoverWrapper.querySelector('.stk-multiselect-item_select-all');
			expect(selectAll).toBeTruthy();
		});

		it('не должен отображать "Выбрать все" по умолчанию', () => {
			const ms = new MultiselectComponent({
				selector: input,
				items: ITEMS,
			});

			ms.open();
			const selectAll = ms.popoverWrapper.querySelector('.stk-multiselect-item_select-all');
			expect(selectAll).toBeNull();
		});

		it('disabled элемент должен иметь класс _disabled', () => {
			const ms = new MultiselectComponent({
				selector: input,
				items: ITEMS,
			});

			ms.open();
			const listItems = ms.popoverWrapper.querySelectorAll('.stk-dropdown-item');
			// "Чёрный" — index 3 — disabled
			expect(listItems[3].classList.contains('stk-dropdown-item_disabled')).toBe(true);
		});
	});

	// ========================================================================
	// value()
	// ========================================================================
	describe('value()', () => {
		it('value() возвращает пустой массив, если ничего не выбрано', () => {
			const ms = new MultiselectComponent({
				selector: input,
				items: ITEMS,
			});

			expect(ms.value()).toEqual([]);
		});

		it('value([...]) программно выбирает элементы', () => {
			const ms = new MultiselectComponent({
				selector: input,
				items: ITEMS,
			});
			const handler = vi.fn();
			ms.on('change', handler);

			ms.value(['red', 'green']);

			const selected = ms.value();
			expect(selected.length).toBe(2);
			expect(selected.map((i) => i.value)).toEqual(['red', 'green']);
			expect(handler).toHaveBeenCalledOnce();
		});

		it('value([]) снимает все выделения', () => {
			const ms = new MultiselectComponent({
				selector: input,
				items: ITEMS,
				values: ['red', 'blue'],
			});

			ms.value([]);

			expect(ms.value()).toEqual([]);
		});

		it('value([-1]) выбирает все элементы (кроме disabled)', () => {
			const ms = new MultiselectComponent({
				selector: input,
				items: ITEMS,
			});
			const handler = vi.fn();
			ms.on('change', handler);

			ms.value([-1]);

			const selected = ms.value();
			// 4 enabled элемента (без "Чёрный")
			expect(selected.length).toBe(4);
			expect(selected.every((i) => !i.disabled)).toBe(true);
			expect(handler).toHaveBeenCalledOnce();
		});

		it('value() не выбирает disabled элементы', () => {
			const ms = new MultiselectComponent({
				selector: input,
				items: ITEMS,
			});

			ms.value(['red', 'black']); // "Чёрный" disabled

			const selected = ms.value();
			expect(selected.length).toBe(1);
			expect(selected[0].value).toBe('red');
		});
	});

	// ========================================================================
	// Теги
	// ========================================================================
	describe('теги', () => {
		it('теги скрыты если ничего не выбрано', () => {
			const ms = new MultiselectComponent({
				selector: input,
				items: ITEMS,
			});

			const tagsContainer = ms.wrapper.querySelector('.stk-multiselect-tags') as HTMLElement;
			expect(tagsContainer.style.display).toBe('none');
		});

		it('tagMode="multiple" — отдельный тег для каждого элемента', () => {
			const ms = new MultiselectComponent({
				selector: input,
				items: ITEMS,
				values: ['red', 'blue', 'green'],
				tagMode: 'multiple',
			});

			const tags = ms.wrapper.querySelectorAll('.stk-multiselect-tag');
			expect(tags.length).toBe(3);
		});

		it('tagMode="single" — один суммарный тег', () => {
			const ms = new MultiselectComponent({
				selector: input,
				items: ITEMS,
				values: ['red', 'blue', 'green'],
				tagMode: 'single',
			});

			const tags = ms.wrapper.querySelectorAll('.stk-multiselect-tag');
			expect(tags.length).toBe(1);

			const tagText = tags[0].querySelector('.stk-multiselect-tag__text');
			expect(tagText?.textContent).toBe('Выбрано: 3');
		});

		it('тег должен содержать кнопку удаления', () => {
			const ms = new MultiselectComponent({
				selector: input,
				items: ITEMS,
				values: ['red'],
			});

			const removeBtn = ms.wrapper.querySelector('.stk-multiselect-tag__remove');
			expect(removeBtn).toBeTruthy();
		});
	});

	// ========================================================================
	// setItems()
	// ========================================================================
	describe('setItems()', () => {
		it('должен обновлять список и убирать несуществующие из выбранных', () => {
			const ms = new MultiselectComponent({
				selector: input,
				items: ITEMS,
				values: ['red', 'blue'],
			});

			const newItems: DropdownItem[] = [
				{ value: 'red', text: 'Красный' },
				{ value: 'yellow', text: 'Жёлтый' },
			];

			ms.setItems(newItems);

			const selected = ms.value();
			expect(selected.length).toBe(1);
			expect(selected[0].value).toBe('red');

			ms.open();
			const listItems = ms.popoverWrapper.querySelectorAll('.stk-dropdown-item');
			expect(listItems.length).toBe(2);
		});
	});

	// ========================================================================
	// maxSelectedItems
	// ========================================================================
	describe('maxSelectedItems', () => {
		it('не должен позволять выбрать больше лимита', () => {
			const ms = new MultiselectComponent({
				selector: input,
				items: ITEMS,
				maxSelectedItems: 2,
			});

			ms.value(['red', 'blue', 'green']); // Попытка выбрать 3

			// Через value() допускается т.к. это программный метод
			// Но через _toggleItem() (UI) лимит работает
			// Поэтому проверим через keyboard
			// Сначала очищаем
			ms.value([]);

			ms.open();
			// Выбираем 2 через keyboard
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

			// Попытка выбрать 3-й
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

			const selected = ms.value();
			expect(selected.length).toBe(2);
		});
	});

	// ========================================================================
	// Keyboard
	// ========================================================================
	describe('keyboard', () => {
		it('ArrowDown/ArrowUp навигация по списку', () => {
			const ms = new MultiselectComponent({
				selector: input,
				items: ITEMS,
			});

			ms.open();
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

			let focused = ms.popoverWrapper.querySelector('.stk-dropdown-item_focused');
			expect(focused).toBeTruthy();

			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
			focused = ms.popoverWrapper.querySelector('.stk-dropdown-item_focused');
			expect(focused).toBeTruthy();
		});

		it('Space/Enter toggle чекбокса', () => {
			const ms = new MultiselectComponent({
				selector: input,
				items: ITEMS,
			});
			const handler = vi.fn();
			ms.on('change', handler);

			ms.open();
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
			input.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

			expect(handler).toHaveBeenCalledOnce();

			// Повторное нажатие — снять
			input.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
			expect(handler).toHaveBeenCalledTimes(2);
			expect(ms.value().length).toBe(0);
		});

		it('Backspace удаляет последний выбранный элемент', () => {
			const ms = new MultiselectComponent({
				selector: input,
				items: ITEMS,
				values: ['red', 'blue'],
			});

			// Input пустой → Backspace удаляет последний
			input.value = '';
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));

			const selected = ms.value();
			expect(selected.length).toBe(1);
			expect(selected[0].value).toBe('red');
		});
	});

	// ========================================================================
	// События
	// ========================================================================
	describe('события', () => {
		it('должен эмитить change с массивом', () => {
			const ms = new MultiselectComponent({
				selector: input,
				items: ITEMS,
			});
			const handler = vi.fn();
			ms.on('change', handler);

			ms.value(['red', 'green']);

			expect(handler).toHaveBeenCalledOnce();
			const emittedItems = handler.mock.calls[0][0];
			expect(Array.isArray(emittedItems)).toBe(true);
			expect(emittedItems.length).toBe(2);
		});

		it('должен эмитить open/close', () => {
			const ms = new MultiselectComponent({
				selector: input,
				items: ITEMS,
			});
			const openHandler = vi.fn();
			const closeHandler = vi.fn();

			ms.on('open', openHandler);
			ms.on('close', closeHandler);

			ms.open();
			expect(openHandler).toHaveBeenCalledOnce();

			ms.close();
			expect(closeHandler).toHaveBeenCalledOnce();
		});
	});
});

