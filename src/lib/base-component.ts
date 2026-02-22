import './base-component.css';
import { autoUpdate, computePosition, flip, offset } from '@floating-ui/dom';
import { BaseEventEmitter } from '../bus-event-emmiter.ts';
import type { BaseComponentEvents, BaseComponentProps, BaseComponentState, DropdownItem } from './types.ts';
import type { Unsubscribe } from '../bus-event-emmiter.ts';
import type { DataSource } from './data-source.ts';
import { StkProxyStateManager } from 'stk-proxy-state-manager';

/**
 * Базовый компонент — реализует общую структуру:
 * обёртка, инпут, кнопка-стрелка, попап (portal + floating-ui).
 *
 * Подклассы должны реализовать абстрактные методы:
 * - `_renderItems()` — рендер содержимого внутри поповера
 * - `setItems()` — обновление списка элементов
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

	/** DataSource и его подписки */
	private _dataSource: DataSource<DropdownItem> | null = null;
	private _dsUnsubscribers: Unsubscribe[] = [];

	/** Элемент индикатора загрузки */
	private readonly _loadingElement = document.createElement('div');

	/** Привязанные обработчики (для корректного removeEventListener) */
	private readonly _handleDocumentMouseDown = this._onDocumentMouseDown.bind(this);
	private readonly _handleRootKeyDown = this._onRootKeyDown.bind(this);
	private readonly _handleRootMouseDown = this._onRootMouseDown.bind(this);
	private readonly _handleArrowClick = this._onArrowClick.bind(this);
	private readonly _handleRootFocus = this._onRootFocus.bind(this);

	protected constructor(props: BaseComponentProps<TState>) {
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

		// Настроить DOM загрузочного индикатора
		this._loadingElement.className = 'stk-dropdown-loading';
		this._loadingElement.textContent = 'Загрузка...';

		this._buildDOM();
		this._setupSubscriptions();
		this._setupEventListeners();
		this._initialized = true;
	}

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

	/** Источник данных (если задан) */
	public get dataSource(): DataSource<DropdownItem> | null {
		return this._dataSource;
	}

	/** Открыть попап */
	public open(): void {
		if (this._stateManager.get('disabled')) {
			return;
		}
		this._stateManager.set('opened', true);
	}

	/** Закрыть попап */
	public close(): void {
		this._stateManager.set('opened', false);
	}

	/** Переключить видимость попапа */
	public toggle(): void {
		if (this._stateManager.get('opened')) {
			this.close();
		}
		else {
			this.open();
		}
	}

	/** Заблокировать компонент */
	public disable(): void {
		this._stateManager.set('disabled', true);
	}

	/** Разблокировать компонент */
	public enable(): void {
		this._stateManager.set('disabled', false);
	}

	/** Уничтожить компонент: снять обработчики, восстановить DOM */
	public destroy(): void {
		// Cleanup autoUpdate
		this._cleanupAutoUpdate?.();
		this._cleanupAutoUpdate = null;

		// Снять глобальные обработчики
		document.removeEventListener('mousedown', this._handleDocumentMouseDown);

		// Снять обработчики с элементов
		this.root.removeEventListener('keydown', this._handleRootKeyDown);
		this.root.removeEventListener('focus', this._handleRootFocus);
		this.root.removeEventListener('mousedown', this._handleRootMouseDown);
		this._arrowButton.removeEventListener('mousedown', this._handleArrowClick);

		// Отписаться от DataSource
		this._dsUnsubscribers.forEach((unsub) => unsub());
		this._dsUnsubscribers = [];

		// Восстановить DOM: вынуть input из wrapper, убрать wrapper
		this.wrapper.before(this.root);
		this.wrapper.remove();

		// Убрать попап
		this.popoverWrapper.remove();
	}

	/** Обновить список элементов (реализуется в подклассах) */
	public abstract setItems(items: DropdownItem[]): void;

	/** Рендер содержимого попапа (список элементов) */
	protected abstract _renderItems(): void;

	/**
	 * Hook: вызывается при открытии попапа (до display: block).
	 * Подклассы переопределяют для монтирования _listElement в DOM.
	 */
	protected _onPopoverOpen(): void {
		// no-op в базовом классе
	}

	/**
	 * Hook: вызывается при закрытии попапа (до display: none).
	 * Подклассы переопределяют для демонтирования _listElement из DOM.
	 */
	protected _onPopoverClose(): void {
		// no-op в базовом классе
	}

	/** Флаг: конструктор базового класса завершён */
	private _initialized = false;

	/**
	 * Инициализировать DataSource — подписаться на его события.
	 * Если данные уже загружены (синхронный массив) — сразу применить.
	 * Иначе — запустить асинхронную загрузку.
	 */
	protected _initDataSource(ds: DataSource<DropdownItem>): void {
		this._dataSource = ds;

		const unsubLoading = ds.on('loading', () => {
			this._showLoading();
		});

		const unsubLoad = ds.on('load', (items) => {
			this._hideLoading();
			this.setItems(items);
		});

		const unsubError = ds.on('error', (err) => {
			this._hideLoading();
			console.error('[BaseComponent] DataSource error:', err);
		});

		this._dsUnsubscribers.push(unsubLoading, unsubLoad, unsubError);

		// Синхронный путь: кэш уже готов
		const cached = ds.getData();
		if (cached !== null) {
			this.setItems(cached);
		}
		else {
			// Асинхронный путь: запустить загрузку
			void ds.fetch();
		}
	}

	/** Построить DOM-структуру компонента */
	private _buildDOM(): void {
		// Wrapper
		this.wrapper.className = 'stk-dropdown-wrapper';

		// Arrow button
		this._arrowButton.className = 'stk-dropdown-arrow';
		this._arrowButton.type = 'button';
		this._arrowButton.tabIndex = -1;
		this._arrowButton.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>';

		// Input
		this.root.setAttribute('autocomplete', 'off');
		this.root.classList.add('stk-dropdown-input');

		// Собираем: wrapper → [input, arrow]
		this.root.before(this.wrapper);
		this.wrapper.appendChild(this.root);
		this.wrapper.appendChild(this._arrowButton);

		// Popover
		this.popoverWrapper.className = 'stk-dropdown-popover';
		const portal = this._getOrCreatePortal();
		portal.appendChild(this.popoverWrapper);
	}

	/** Получить или создать portal-контейнер */
	private _getOrCreatePortal(): HTMLElement {
		const existing = document.querySelector<HTMLElement>('#stk-dropdown-portal');
		if (existing) {
			return existing;
		}

		const portal = document.createElement('div');
		portal.id = 'stk-dropdown-portal';
		portal.className = 'stk-dropdown-portal';
		document.body.appendChild(portal);
		return portal;
	}

	/** Настроить реактивные подписки на состояние */
	private _setupSubscriptions(): void {
		// opened → mount/unmount списка + toggle попапа + emit событий
		this._stateManager.subscribe(
			'opened' as keyof TState,
			(newVal) => {
				const isOpened = newVal as boolean;

				if (isOpened) {
					if (this._initialized) {
						this._onPopoverOpen();
					}
					this.popoverWrapper.style.display = 'block';
					this.wrapper.classList.add('stk-dropdown-wrapper_opened');
					this._arrowButton.classList.add('stk-dropdown-arrow_opened');
					void this._updatePosition();
					this.emit('open' as keyof TEvents, undefined as TEvents[keyof TEvents]);
				}
				else {
					if (this._initialized) {
						this._onPopoverClose();
					}
					this.popoverWrapper.style.display = 'none';
					this.wrapper.classList.remove('stk-dropdown-wrapper_opened');
					this._arrowButton.classList.remove('stk-dropdown-arrow_opened');
					this.emit('close' as keyof TEvents, undefined as TEvents[keyof TEvents]);
				}
			},
			{ emitImmediately: true }
		);

		// disabled → заблокировать/разблокировать input и wrapper
		this._stateManager.subscribe(
			'disabled' as keyof TState,
			(newVal) => {
				const isDisabled = newVal as boolean;
				this.root.disabled = isDisabled;
				this._arrowButton.disabled = isDisabled;
				this.wrapper.classList.toggle('stk-dropdown-wrapper_disabled', isDisabled);

				if (isDisabled) {
					this.close();
				}
			},
			{ emitImmediately: true }
		);
	}

	/** Настроить обработчики DOM-событий */
	private _setupEventListeners(): void {
		// Click-outside (mousedown, чтобы успеть до blur)
		document.addEventListener('mousedown', this._handleDocumentMouseDown);

		// Keyboard на input
		this.root.addEventListener('keydown', this._handleRootKeyDown);

		// Focus на input → открыть попап (первый раз, когда фокус приходит с другого элемента)
		this.root.addEventListener('focus', this._handleRootFocus);

		// Mousedown на input → открыть попап если фокус уже был (focus не стреляет повторно)
		this.root.addEventListener('mousedown', this._handleRootMouseDown);

		// Click по стрелке → toggle (mousedown чтобы не потерять focus)
		this._arrowButton.addEventListener('mousedown', this._handleArrowClick);

		// autoUpdate — следить за позицией попапа
		this._cleanupAutoUpdate = autoUpdate(
			this.wrapper,
			this.popoverWrapper,
			this._updatePosition
		);
	}

	/** Показать индикатор загрузки */
	private _showLoading(): void {
		this.popoverWrapper.appendChild(this._loadingElement);
		this.popoverWrapper.classList.add('stk-dropdown-popover_loading');
	}

	/** Скрыть индикатор загрузки */
	private _hideLoading(): void {
		this._loadingElement.remove();
		this.popoverWrapper.classList.remove('stk-dropdown-popover_loading');
	}

	/** Click-outside: закрыть попап при клике вне компонента */
	private _onDocumentMouseDown(event: MouseEvent): void {
		const target = event.target as Node;
		const isInsideWrapper = this.wrapper.contains(target);
		const isInsidePopover = this.popoverWrapper.contains(target);

		if (!isInsideWrapper && !isInsidePopover) {
			this.close();
		}
	}

	/** Keyboard: Escape → закрыть */
	private _onRootKeyDown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			this.close();
			this.root.blur();
		}
	}

	/** Focus на input → открыть (когда фокус приходит с другого элемента) */
	private _onRootFocus(): void {
		this.open();
	}

	/**
	 * Mousedown на input → открыть попап если он уже закрыт, но фокус уже был на инпуте.
	 * Событие focus не повторяется при повторном клике на уже сфокусированный элемент,
	 * поэтому нужен отдельный обработчик mousedown.
	 */
	private _onRootMouseDown(): void {
		if (!this._stateManager.get('opened')) {
			// Небольшая задержка нужна, чтобы mousedown на item попапа
			// успел отработать (выбор + close) до того, как мы откроем снова.
			// При обычном клике на инпут задержки нет — open() вызывается сразу.
			this.open();
		}
	}

	/** Click по кнопке-стрелке → toggle */
	private _onArrowClick(event: MouseEvent): void {
		// не терять focus с input
		event.preventDefault();
		this.toggle();
	}

	/** Обновить позицию попапа через @floating-ui */
	private _updatePosition = async (): Promise<void> => {
		const { x, y, strategy } = await computePosition(
			this.wrapper,
			this.popoverWrapper,
			{
				strategy: 'fixed',
				placement: 'bottom-start',
				middleware: [offset(4), flip()]
			}
		);

		Object.assign(this.popoverWrapper.style, {
			left: `${x}px`,
			top: `${y}px`,
			position: strategy,
			// сделать ширину попапа равной ширине wrapper-а
			width: `${this.wrapper.offsetWidth}px`
		});
	}
}
