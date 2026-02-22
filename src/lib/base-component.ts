import './base-component.css';
import { autoUpdate, computePosition, flip, offset } from '@floating-ui/dom';
import { BaseEventEmitter } from '../bus-event-emmiter.ts';
import type { BaseComponentEvents, BaseComponentProps, BaseComponentState } from './types.ts';
import { StkProxyStateManager } from 'stk-proxy-state-manager';

/**
 * Базовый компонент — реализует общую структуру:
 * обёртка, инпут, кнопка-стрелка, попап (portal + floating-ui).
 *
 * Подклассы должны реализовать абстрактный метод `_renderItems()`
 * для рендера своего содержимого внутри поповера.
 */
export abstract class BaseComponent<
	TState extends BaseComponentState = BaseComponentState,
	TEvents extends BaseComponentEvents = BaseComponentEvents,
> extends BaseEventEmitter<TEvents> {
	protected readonly _stateManager: StkProxyStateManager<TState>;
	protected readonly _rootElement: HTMLInputElement;

	private readonly _wrapperElement = document.createElement('span');
	private readonly _popoverElement = document.createElement('div');
	private readonly _arrowButton = document.createElement('button');

	/** Cleanup-функция от autoUpdate (для destroy) */
	private _cleanupAutoUpdate: (() => void) | null = null;

	/** Привязанные обработчики (для корректного removeEventListener) */
	private readonly _handleDocumentMouseDown = this._onDocumentMouseDown.bind(this);
	private readonly _handleRootKeyDown = this._onRootKeyDown.bind(this);
	private readonly _handleArrowClick = this._onArrowClick.bind(this);
	private readonly _handleRootFocus = this._onRootFocus.bind(this);

	constructor(props: BaseComponentProps<TState>) {
		super();
		const { selector, state } = props;
		const element = typeof selector === 'string'
			? document.querySelector<HTMLInputElement>(selector)
			: selector;

		if (!element) {
			throw new Error(`[BaseComponent]: Root element not found for selector "${selector}"`);
		}

		this._stateManager = new StkProxyStateManager<TState>(state);
		this._rootElement = element;

		this._buildDOM();
		this._setupSubscriptions();
		this._setupEventListeners();
	}

	// ========================================================================
	// Публичные геттеры
	// ========================================================================

	/** Корневой input-элемент */
	public get root(): HTMLInputElement {
		return this._rootElement;
	}

	/** Обёртка компонента */
	public get wrapper(): HTMLElement {
		return this._wrapperElement;
	}

	/** Контейнер попапа */
	public get popoverWrapper(): HTMLElement {
		return this._popoverElement;
	}

	// ========================================================================
	// Публичные методы
	// ========================================================================

	/** Открыть попап */
	public open(): void {
		if (this._stateManager.get('disabled' as keyof TState)) return;
		this._stateManager.set('opened' as keyof TState, true as TState[keyof TState]);
	}

	/** Закрыть попап */
	public close(): void {
		this._stateManager.set('opened' as keyof TState, false as TState[keyof TState]);
	}

	/** Переключить видимость попапа */
	public toggle(): void {
		if (this._stateManager.get('opened' as keyof TState)) {
			this.close();
		} else {
			this.open();
		}
	}

	/** Заблокировать компонент */
	public disable(): void {
		this._stateManager.set('disabled' as keyof TState, true as TState[keyof TState]);
	}

	/** Разблокировать компонент */
	public enable(): void {
		this._stateManager.set('disabled' as keyof TState, false as TState[keyof TState]);
	}

	/** Уничтожить компонент: снять обработчики, восстановить DOM */
	public destroy(): void {
		// Cleanup autoUpdate
		this._cleanupAutoUpdate?.();
		this._cleanupAutoUpdate = null;

		// Снять глобальные обработчики
		document.removeEventListener('mousedown', this._handleDocumentMouseDown);

		// Снять обработчики с элементов
		this._rootElement.removeEventListener('keydown', this._handleRootKeyDown);
		this._rootElement.removeEventListener('focus', this._handleRootFocus);
		this._arrowButton.removeEventListener('mousedown', this._handleArrowClick);

		// Восстановить DOM: вынуть input из wrapper, убрать wrapper
		this._wrapperElement.before(this._rootElement);
		this._wrapperElement.remove();

		// Убрать попап
		this._popoverElement.remove();
	}

	// ========================================================================
	// Абстрактные методы — обязательны к реализации в подклассах
	// ========================================================================

	/** Рендер содержимого попапа (список элементов) */
	protected abstract _renderItems(): void;

	// ========================================================================
	// Приватные методы — построение DOM
	// ========================================================================

	/** Построить DOM-структуру компонента */
	private _buildDOM(): void {
		// Wrapper
		this._wrapperElement.className = 'stk-dropdown-wrapper';

		// Arrow button
		this._arrowButton.className = 'stk-dropdown-arrow';
		this._arrowButton.type = 'button';
		this._arrowButton.tabIndex = -1;
		this._arrowButton.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>';

		// Input
		this._rootElement.setAttribute('autocomplete', 'off');
		this._rootElement.classList.add('stk-dropdown-input');

		// Собираем: wrapper → [input, arrow]
		this._rootElement.before(this._wrapperElement);
		this._wrapperElement.appendChild(this._rootElement);
		this._wrapperElement.appendChild(this._arrowButton);

		// Popover
		this._popoverElement.className = 'stk-dropdown-popover';
		const portal = this._getOrCreatePortal();
		portal.appendChild(this._popoverElement);
	}

	/** Получить или создать portal-контейнер */
	private _getOrCreatePortal(): HTMLElement {
		const existing = document.querySelector<HTMLElement>('#stk-dropdown-portal');
		if (existing) return existing;

		const portal = document.createElement('div');
		portal.id = 'stk-dropdown-portal';
		portal.className = 'stk-dropdown-portal';
		document.body.appendChild(portal);
		return portal;
	}

	// ========================================================================
	// Приватные методы — подписки на состояние
	// ========================================================================

	/** Настроить реактивные подписки на состояние */
	private _setupSubscriptions(): void {
		// opened → toggle попапа + emit событий
		this._stateManager.subscribe(
			'opened' as keyof TState,
			(newVal) => {
				const isOpened = newVal as boolean;
				this._popoverElement.style.display = isOpened ? 'block' : 'none';
				this._wrapperElement.classList.toggle('stk-dropdown-wrapper_opened', isOpened);
				this._arrowButton.classList.toggle('stk-dropdown-arrow_opened', isOpened);

				if (isOpened) {
					void this._updatePosition();
					this.emit('open' as keyof TEvents, undefined as TEvents[keyof TEvents]);
				} else {
					this.emit('close' as keyof TEvents, undefined as TEvents[keyof TEvents]);
				}
			},
			{ emitImmediately: true },
		);

		// disabled → заблокировать/разблокировать input и wrapper
		this._stateManager.subscribe(
			'disabled' as keyof TState,
			(newVal) => {
				const isDisabled = newVal as boolean;
				this._rootElement.disabled = isDisabled;
				this._arrowButton.disabled = isDisabled;
				this._wrapperElement.classList.toggle('stk-dropdown-wrapper_disabled', isDisabled);

				if (isDisabled) {
					this.close();
				}
			},
			{ emitImmediately: true },
		);
	}

	// ========================================================================
	// Приватные методы — обработчики событий
	// ========================================================================

	/** Настроить обработчики DOM-событий */
	private _setupEventListeners(): void {
		// Click-outside (mousedown, чтобы успеть до blur)
		document.addEventListener('mousedown', this._handleDocumentMouseDown);

		// Keyboard на input
		this._rootElement.addEventListener('keydown', this._handleRootKeyDown);

		// Focus на input → открыть попап
		this._rootElement.addEventListener('focus', this._handleRootFocus);

		// Click по стрелке → toggle (mousedown чтобы не потерять focus)
		this._arrowButton.addEventListener('mousedown', this._handleArrowClick);

		// autoUpdate — следить за позицией попапа
		this._cleanupAutoUpdate = autoUpdate(
			this._wrapperElement,
			this._popoverElement,
			() => void this._updatePosition(),
		);
	}

	/** Click-outside: закрыть попап при клике вне компонента */
	private _onDocumentMouseDown(event: MouseEvent): void {
		const target = event.target as Node;
		const isInsideWrapper = this._wrapperElement.contains(target);
		const isInsidePopover = this._popoverElement.contains(target);

		if (!isInsideWrapper && !isInsidePopover) {
			this.close();
		}
	}

	/** Keyboard: Escape → закрыть */
	private _onRootKeyDown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			this.close();
			this._rootElement.blur();
		}
	}

	/** Focus на input → открыть */
	private _onRootFocus(): void {
		this.open();
	}

	/** Click по кнопке-стрелке → toggle */
	private _onArrowClick(event: MouseEvent): void {
		event.preventDefault(); // не терять focus с input
		this.toggle();
	}

	// ========================================================================
	// Приватные методы — позиционирование
	// ========================================================================

	/** Обновить позицию попапа через @floating-ui */
	private async _updatePosition(): Promise<void> {
		const { x, y, strategy } = await computePosition(
			this._wrapperElement,
			this._popoverElement,
			{
				strategy: 'fixed',
				placement: 'bottom-start',
				middleware: [offset(4), flip()],
			},
		);

		Object.assign(this._popoverElement.style, {
			left: `${x}px`,
			top: `${y}px`,
			position: strategy,
		});
	}
}
