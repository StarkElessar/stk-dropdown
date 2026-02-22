import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BaseComponent } from '../src/lib/base-component';
import type { BaseComponentEvents, BaseComponentProps, BaseComponentState, DropdownItem } from '../src/lib/types';

// Конкретная реализация для тестов (BaseComponent — абстрактный)
class TestComponent extends BaseComponent<BaseComponentState, BaseComponentEvents> {
	public renderItemsCalls = 0;

	constructor(props: BaseComponentProps<BaseComponentState>) {
		super(props);
	}

	public setItems(_items: DropdownItem[]): void {
		// заглушка
	}

	protected _renderItems(): void {
		this.renderItemsCalls++;
	}
}

function createInput(id = 'test-input'): HTMLInputElement {
	const input = document.createElement('input');
	input.type = 'text';
	input.id = id;
	document.body.appendChild(input);
	return input;
}

describe('BaseComponent', () => {
	let input: HTMLInputElement;

	beforeEach(() => {
		input = createInput();
	});

	afterEach(() => {
		// Чистим DOM
		document.body.innerHTML = '';
		document.querySelector('#stk-dropdown-portal')?.remove();
	});

	// ========================================================================
	// Создание
	// ========================================================================
	describe('создание', () => {
		it('должен создавать компонент по HTMLInputElement', () => {
			const component = new TestComponent({
				selector: input,
				state: { opened: false, disabled: false },
			});

			expect(component.root).toBe(input);
		});

		it('должен создавать компонент по CSS-селектору', () => {
			const component = new TestComponent({
				selector: '#test-input',
				state: { opened: false, disabled: false },
			});

			expect(component.root).toBe(input);
		});

		it('должен бросать ошибку при невалидном селекторе', () => {
			expect(() => {
				new TestComponent({
					selector: '#non-existent',
					state: { opened: false, disabled: false },
				});
			}).toThrow('[BaseComponent]: Root element not found');
		});
	});

	// ========================================================================
	// DOM-структура
	// ========================================================================
	describe('DOM-структура', () => {
		it('должен оборачивать input в wrapper', () => {
			const component = new TestComponent({
				selector: input,
				state: { opened: false, disabled: false },
			});

			expect(component.wrapper.classList.contains('stk-dropdown-wrapper')).toBe(true);
			expect(component.wrapper.contains(component.root)).toBe(true);
		});

		it('должен добавлять кнопку-стрелку в wrapper', () => {
			new TestComponent({
				selector: input,
				state: { opened: false, disabled: false },
			});

			const arrow = input.parentElement?.querySelector('.stk-dropdown-arrow');
			expect(arrow).toBeTruthy();
			expect(arrow?.tagName).toBe('BUTTON');
		});

		it('должен создавать popover-контейнер', () => {
			const component = new TestComponent({
				selector: input,
				state: { opened: false, disabled: false },
			});

			expect(component.popoverWrapper.classList.contains('stk-dropdown-popover')).toBe(true);
		});

		it('должен создавать portal-контейнер в body', () => {
			new TestComponent({
				selector: input,
				state: { opened: false, disabled: false },
			});

			const portal = document.querySelector('#stk-dropdown-portal');
			expect(portal).toBeTruthy();
			expect(portal?.classList.contains('stk-dropdown-portal')).toBe(true);
		});

		it('должен переиспользовать существующий portal', () => {
			const portal = document.createElement('div');
			portal.id = 'stk-dropdown-portal';
			document.body.appendChild(portal);

			new TestComponent({
				selector: input,
				state: { opened: false, disabled: false },
			});

			const portals = document.querySelectorAll('#stk-dropdown-portal');
			expect(portals.length).toBe(1);
		});

		it('должен устанавливать autocomplete="off" на input', () => {
			new TestComponent({
				selector: input,
				state: { opened: false, disabled: false },
			});

			expect(input.getAttribute('autocomplete')).toBe('off');
		});
	});

	// ========================================================================
	// open / close / toggle
	// ========================================================================
	describe('open / close / toggle', () => {
		it('попап должен быть скрыт по умолчанию', () => {
			const component = new TestComponent({
				selector: input,
				state: { opened: false, disabled: false },
			});

			expect(component.popoverWrapper.style.display).toBe('none');
		});

		it('open() должен показывать попап', () => {
			const component = new TestComponent({
				selector: input,
				state: { opened: false, disabled: false },
			});

			component.open();
			expect(component.popoverWrapper.style.display).toBe('block');
		});

		it('close() должен скрывать попап', () => {
			const component = new TestComponent({
				selector: input,
				state: { opened: true, disabled: false },
			});

			component.close();
			expect(component.popoverWrapper.style.display).toBe('none');
		});

		it('toggle() должен переключать видимость', () => {
			const component = new TestComponent({
				selector: input,
				state: { opened: false, disabled: false },
			});

			component.toggle();
			expect(component.popoverWrapper.style.display).toBe('block');

			component.toggle();
			expect(component.popoverWrapper.style.display).toBe('none');
		});

		it('open() должен добавлять CSS-класс _opened на wrapper', () => {
			const component = new TestComponent({
				selector: input,
				state: { opened: false, disabled: false },
			});

			component.open();
			expect(component.wrapper.classList.contains('stk-dropdown-wrapper_opened')).toBe(true);

			component.close();
			expect(component.wrapper.classList.contains('stk-dropdown-wrapper_opened')).toBe(false);
		});
	});

	// ========================================================================
	// События
	// ========================================================================
	describe('события', () => {
		it('должен эмитить событие open при открытии', () => {
			const component = new TestComponent({
				selector: input,
				state: { opened: false, disabled: false },
			});
			const handler = vi.fn();

			component.on('open', handler);
			component.open();

			expect(handler).toHaveBeenCalledOnce();
		});

		it('должен эмитить событие close при закрытии', () => {
			const component = new TestComponent({
				selector: input,
				state: { opened: true, disabled: false },
			});
			const handler = vi.fn();

			component.on('close', handler);
			component.close();

			expect(handler).toHaveBeenCalledOnce();
		});
	});

	// ========================================================================
	// disable / enable
	// ========================================================================
	describe('disable / enable', () => {
		it('disable() должен блокировать input', () => {
			const component = new TestComponent({
				selector: input,
				state: { opened: false, disabled: false },
			});

			component.disable();
			expect(component.root.disabled).toBe(true);
		});

		it('disable() должен добавлять CSS-класс _disabled', () => {
			const component = new TestComponent({
				selector: input,
				state: { opened: false, disabled: false },
			});

			component.disable();
			expect(component.wrapper.classList.contains('stk-dropdown-wrapper_disabled')).toBe(true);
		});

		it('disable() должен закрывать попап, если он открыт', () => {
			const component = new TestComponent({
				selector: input,
				state: { opened: true, disabled: false },
			});

			component.disable();
			expect(component.popoverWrapper.style.display).toBe('none');
		});

		it('open() не должен работать, если компонент disabled', () => {
			const component = new TestComponent({
				selector: input,
				state: { opened: false, disabled: true },
			});

			component.open();
			expect(component.popoverWrapper.style.display).toBe('none');
		});

		it('enable() должен разблокировать input', () => {
			const component = new TestComponent({
				selector: input,
				state: { opened: false, disabled: true },
			});

			component.enable();
			expect(component.root.disabled).toBe(false);
			expect(component.wrapper.classList.contains('stk-dropdown-wrapper_disabled')).toBe(false);
		});
	});

	// ========================================================================
	// Keyboard
	// ========================================================================
	describe('keyboard', () => {
		it('Escape должен закрывать попап', () => {
			const component = new TestComponent({
				selector: input,
				state: { opened: false, disabled: false },
			});

			component.open();
			expect(component.popoverWrapper.style.display).toBe('block');

			const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
			input.dispatchEvent(event);

			expect(component.popoverWrapper.style.display).toBe('none');
		});
	});

	// ========================================================================
	// click-outside
	// ========================================================================
	describe('click-outside', () => {
		it('клик вне компонента должен закрывать попап', () => {
			const component = new TestComponent({
				selector: input,
				state: { opened: false, disabled: false },
			});

			component.open();

			const event = new MouseEvent('mousedown', { bubbles: true });
			document.body.dispatchEvent(event);

			expect(component.popoverWrapper.style.display).toBe('none');
		});

		it('клик внутри попапа не должен закрывать его', () => {
			const component = new TestComponent({
				selector: input,
				state: { opened: false, disabled: false },
			});

			component.open();

			const event = new MouseEvent('mousedown', { bubbles: true });
			component.popoverWrapper.dispatchEvent(event);

			expect(component.popoverWrapper.style.display).toBe('block');
		});
	});

	// ========================================================================
	// Arrow button
	// ========================================================================
	describe('arrow button', () => {
		it('mousedown на кнопке-стрелке должен открывать попап', () => {
			const component = new TestComponent({
				selector: input,
				state: { opened: false, disabled: false },
			});

			const arrowBtn = component.wrapper.querySelector<HTMLElement>('.stk-dropdown-arrow')!;
			expect(arrowBtn).toBeTruthy();

			const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
			arrowBtn.dispatchEvent(event);

			expect(component.popoverWrapper.style.display).toBe('block');
		});

		it('второй mousedown на стрелке должен закрывать попап (toggle)', () => {
			const component = new TestComponent({
				selector: input,
				state: { opened: false, disabled: false },
			});

			const arrowBtn = component.wrapper.querySelector<HTMLElement>('.stk-dropdown-arrow')!;

			arrowBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
			expect(component.popoverWrapper.style.display).toBe('block');

			arrowBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
			expect(component.popoverWrapper.style.display).toBe('none');
		});

		it('mousedown на стрелке не должен работать если disabled', () => {
			const component = new TestComponent({
				selector: input,
				state: { opened: false, disabled: true },
			});

			const arrowBtn = component.wrapper.querySelector<HTMLElement>('.stk-dropdown-arrow')!;
			arrowBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));

			expect(component.popoverWrapper.style.display).toBe('none');
		});
	});

	// ========================================================================
	// destroy
	// ========================================================================
	describe('destroy', () => {
		it('должен восстанавливать DOM после уничтожения', () => {
			const parent = input.parentElement!;
			const component = new TestComponent({
				selector: input,
				state: { opened: false, disabled: false },
			});

			component.destroy();

			// Input должен быть возвращён в parent
			expect(parent.contains(input)).toBe(true);
			// Wrapper должен быть удалён
			expect(document.querySelector('.stk-dropdown-wrapper')).toBeNull();
		});

		it('должен удалять popover из DOM', () => {
			const component = new TestComponent({
				selector: input,
				state: { opened: false, disabled: false },
			});

			const popover = component.popoverWrapper;
			component.destroy();

			expect(popover.parentElement).toBeNull();
		});

		it('не должен реагировать на click-outside после destroy', () => {
			const component = new TestComponent({
				selector: input,
				state: { opened: false, disabled: false },
			});
			const handler = vi.fn();
			component.on('close', handler);

			component.open();
			component.destroy();

			// Больше не должно эмитить close при клике на document
			handler.mockClear();
			const event = new MouseEvent('mousedown', { bubbles: true });
			document.body.dispatchEvent(event);

			expect(handler).not.toHaveBeenCalled();
		});
	});
});

