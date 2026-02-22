# План: Библиотека stk-dropdown — Combobox, Multiselect, Dropdown

Библиотека из 3 компонентов (Dropdown, Combobox, Multiselect) на чистом TypeScript с ООП-архитектурой.
Все компоненты наследуют `BaseComponent`, который наследует `BaseEventEmitter`.
Реактивное состояние управляется через [`StkProxyStateManager`](https://github.com/StarkElessar/stk-proxy-state-manager).
Позиционирование попапа — `@floating-ui/dom`.
Подход аналогичен Kendo UI jQuery: инициализация на существующем `<input>`, компонент сам строит обёртки и DOM-структуру.

---

## 1. Архитектура: иерархия классов

```
BaseEventEmitter<TEvents>              ← абстрактный, on/off/once/emit
    │
    └── BaseComponent<TState, TEvents> ← обёртка, инпут, кнопка-стрелка, попап, portal, @floating-ui, stk-proxy-state-manager
            │
            ├── DropdownComponent      ← статический список, одиночный выбор, readonly-инпут
            ├── ComboboxComponent      ← текстовый ввод + фильтрация списка, одиночный выбор
            └── MultiselectComponent   ← множественный выбор, теги-чипы, чекбоксы, "Выбрать все"
```

---

## 2. Типы и интерфейсы — `types.ts`

### Общие типы

- **`DropdownItem`** — `{ value: string | number; text: string; disabled?: boolean }` — элемент списка.

### Состояния (State)

- **`BaseComponentState`** — `{ opened: boolean }` — базовое состояние.
- **`DropdownState extends BaseComponentState`** — `{ selectedItem: DropdownItem | null; items: DropdownItem[] }`.
- **`ComboboxState extends DropdownState`** — `{ filterText: string; filteredItems: DropdownItem[] }`.
- **`MultiselectState extends BaseComponentState`** — `{ selectedItems: DropdownItem[]; items: DropdownItem[]; filterText: string; filteredItems: DropdownItem[]; allSelected: boolean }`.

### Props (конфигурация)

- **`BaseComponentProps<S>`** — дженерик: `{ selector: string | HTMLInputElement; state: S }`.
- **`DropdownComponentProps`** — `{ selector; items: DropdownItem[]; placeholder?: string; value?: string | number }`.
- **`ComboboxComponentProps`** — `{ selector; items: DropdownItem[]; placeholder?: string; value?: string | number; filter?: 'contains' | 'startsWith' | 'none'; minFilterLength?: number }`.
- **`MultiselectComponentProps`** — `{ selector; items: DropdownItem[]; placeholder?: string; values?: (string | number)[]; showSelectAll?: boolean; maxSelectedItems?: number; tagMode?: 'single' | 'multiple' }`.

### События (Events)

- **`DropdownEvents`** — `{ change: DropdownItem | null; open: void; close: void }`.
- **`ComboboxEvents extends DropdownEvents`** — `{ filtering: string }`.
- **`MultiselectEvents`** — `{ change: DropdownItem[]; open: void; close: void; selectAll: boolean }`.

---

## 3. Слой BaseEventEmitter

Абстрактный класс, обеспечивающий событийную модель для всех компонентов.

**Методы:**
- `on(event, handler)` — подписка на событие.
- `off(event, handler)` — отписка от события.
- `once(event, handler)` — одноразовая подписка.
- `emit(event, data)` — вызов события.

> Без изменений — текущая реализация в `bus-event-emmiter.ts`.

---

## 4. Слой BaseComponent — рефакторинг `base-component.ts`

### Текущие проблемы

- `_stateManager` приватный — подклассы не имеют доступа.
- Тип state — `Record<string, any>` — отсутствует типизация.
- Нет кнопки-стрелки.
- Нет метода `destroy()`.
- Закрытие по `blur` не работает при клике по элементам попапа.

### Запланированные изменения

1. **Дженерики:** `BaseComponent<TState extends BaseComponentState, TEvents extends object>`.
2. **Доступ к state:** изменить `_stateManager` с `private` на `protected`.
3. **Кнопка-стрелка:** создание элемента `.stk-dropdown-arrow` внутри обёртки с обработчиком клика для toggle попапа.
4. **CSS-классы:** `.stk-dropdown-wrapper` для обёртки.
5. **Click-outside:** заменить `blur`-закрытие на `mousedown` на `document` для корректной работы с элементами попапа.
6. **Публичные методы:**
   - `open()` — открыть попап на уровне Base.
   - `close()` — закрыть попап на уровне Base.
   - `toggle()` — переключить видимость на уровне Base.
   - `destroy()` — удаление обработчиков, cleanup `autoUpdate`, восстановление DOM.
   - `enable()` / `disable()` — управление доступностью, на уровне Base.
   - `value()` - геттер текущего значения, возвращает `any` или `null`, реализация в подклассах.
   - `value()` - своего рода сеттер для программного изменения значения, реализация в подклассах. Для комбобокса и дропдауна — одиночный выбор, для мультиселекта — массив.
7. **Keyboard:** обработка `Escape` для закрытия на уровне Base.
8. **Cleanup:** сохранить cleanup-функцию от `autoUpdate` для корректного `destroy`.
9. **Emit событий:** `open` / `close` / `change` через `BaseEventEmitter`.
10. Абстрактный метод `_renderItems()`, который должны реализовывать все подклассы для рендера своих списков внутри поповера.

---

## 5. DropdownComponent — `dropdown-component.ts`

Компонент выпадающего списка с одиночным выбором. Инпут readonly.

### Состояние

`{ opened, dataItems, selectedItem }`

### DOM-структура попапа

```html
<ul class="stk-dropdown-list">
	<li class="stk-dropdown-item">Элемент 1</li>
	<li class="stk-dropdown-item stk-dropdown-item_selected">Элемент 2</li>
	<li class="stk-dropdown-item stk-dropdown-item_disabled">Элемент 3</li>
</ul>
```

### Реализация

- Приватный метод `_renderItems()` — рендеринг `<ul>` с элементами `<li>`, вызывается при инициализации и при изменении `items` через `_stateManager.subscribe`.
- CSS-класс `.stk-dropdown-item_selected` на выбранном элементе.
- Клик по элементу → обновление `selectedItem`, установка `text` в инпут, закрытие попапа, emit `change`.
- Input readonly — не редактируемый, только отображает выбранное значение.

### Keyboard-навигация

- `ArrowDown` / `ArrowUp` — навигация по списку.
- `Space` — выбор элемента.
- `Escape` — закрытие.

### Публичный API

| Метод / Свойство                        | Описание                                  |
|-----------------------------------------|-------------------------------------------|
| `value(): DropdownItem \| null`         | Метод-геттер текущего выбранного значения |
| `value(value: string \| number): void`  | Метод-сеттер - программный выбор элемента |
| `setItems(items: DropdownItem[]): void` | Обновление списка элементов               |

**События:** `change`, `open`, `close`.

---

## 6. ComboboxComponent — `combobox-component.ts` (новый файл)

Компонент с возможностью текстового ввода и фильтрации списка. Одиночный выбор.

### Состояние

`{ opened, dataItems, selectedItem, filterText, filteredItems }`

### Реализация

- Инпут **редактируемый** — при вводе текста фильтрует список.
- Подписка на `filterText` в state → пересчёт `filteredItems` → перерендер списка.
- **Стратегии фильтрации:** `contains` (по умолчанию), `startsWith`, `none`.
- **Debounce на input** — опциональный, по умолчанию 150ms.
- При выборе элемента — текст подставляется в инпут, попап закрывается.
- Если фильтр не нашёл совпадений — показать сообщение «Ничего не найдено».

### Keyboard-навигация

- `ArrowDown` / `ArrowUp` — навигация по списку.
- `Space` — выбор элемента.
- `Escape` — закрытие.

### Публичный API

| Метод / Свойство                        | Описание                                  |
|-----------------------------------------|-------------------------------------------|
| `value(): DropdownItem \| null`         | Метод-геттер текущего выбранного значения |
| `value(value: string \| number): void`  | Метод-сеттер - программный выбор элемента |
| `setItems(items: DropdownItem[]): void` | Обновление списка элементов               |
| `filter(text: string): void`            | Программная фильтрация                    |

**События:** `change`, `open`, `close`, `filtering`.

---

## 7. MultiselectComponent — `multiselect-component.ts` (новый файл)

Компонент множественного выбора с тегами-чипами и чекбоксами. Нажатие клавиши `Backspace` в инпуте удаляет по очереди выбранные элементы.

### Состояние

`{ opened, dataItems, selectedItems, filterText, filteredItems, allSelected }`

### DOM-структура

```html
<!-- Обёртка с тегами -->
<span class="stk-dropdown-wrapper stk-multiselect-wrapper">
	<span class="stk-multiselect-tags">
		<span class="stk-multiselect-tag">
			<span>Элемент 1</span>
			<button class="stk-multiselect-tag__remove">×</button>
		</span>
		<span class="stk-multiselect-tag">
			<span>Элемент 2 </span>
			<button class="stk-multiselect-tag__remove">×</button>
		</span>
	</span>
	<input type="text" placeholder="Поиск..."/>
	<button class="stk-dropdown-arrow">▼</button>
</span>

<!-- Попап -->
<ul class="stk-dropdown-list stk-multiselect-list">
	<li class="stk-dropdown-item stk-multiselect-item_select-all">
		<input type="checkbox"/>
		<span>Выбрать все</span>
	</li>
	<li class="stk-dropdown-item">
		<input type="checkbox" checked/>
		<span>Элемент 1</span>
	</li>
	<li class="stk-dropdown-item">
		<input type="checkbox"/>
		<span>Элемент 2</span>
	</li>
</ul>
```

Обернул текста в `<span>` внутри тега, чтобы реализовать сокращение до 3-х точек.

### Реализация

- **Теги-чипы:** каждый выбранный элемент — тег с кнопкой удаления (×).
- **`tagMode: 'single'`** — вместо отдельных тегов один суммарный тег «Выбрано: N».
- **Чекбоксы в списке:** каждый `<li>` содержит чекбокс + тег `span` с текстом.
- **«Выбрать все»** — отдельный элемент вверху списка (если `showSelectAll: true`), переключает все элементы.
- **Фильтрация** — аналогично Combobox, по инпуту.
- **Попап не закрывается** после выбора элемента (в отличие от Dropdown/Combobox).
- **`maxSelectedItems`** — ограничение количества выбранных элементов, по умолчанию отключенная фича.

### Keyboard-навигация

- `ArrowDown` / `ArrowUp` — навигация по списку.
- `Space` / `Enter` — toggle чекбокса.
- `Escape` — закрытие.

### Публичный API

| Метод / Свойство                           | Описание                                                                                                           |
|--------------------------------------------|--------------------------------------------------------------------------------------------------------------------|
| `value(): DropdownItem[]`                  | Геттер выбранных элементов, всгде возвращает массив                                                                |
| `value(values: (string \| number)[]): void` | Программный выбор, если передать `[-1]` - выберет все элементы, если передать пустой массив - снимет выбор со всех |
| `setItems(items: DropdownItem[]): void`    | Обновление списка                                                                                                  |

**События:** `change`, `open`, `close`.
То есть у элемента "Все" всегда должна быть `id: -1`

---

## 8. Файловая структура после реализации

```
src/
  bus-event-emmiter.ts              — без изменений
  index.css                         — без изменений
  index.ts                          — обновить: импорт и demo всех 3 компонентов
  lib/
    base-component.ts               — рефакторинг (дженерики, arrow-button, destroy, click-outside)
    base-component.css              — расширить (стили обёртки, кнопки-стрелки, базовый список)
    dropdown-component.ts           — полная реализация
    dropdown-component.css          — создать: стили списка и элементов
    combobox-component.ts           — создать
    combobox-component.css          — создать
    multiselect-component.ts        — создать
    multiselect-component.css       — создать: стили тегов, чекбоксов
    types.ts                        — расширить всеми интерфейсами
    index.ts                        — обновить: экспорт всех 3 компонентов + типов
```

---

## 9. CSS-архитектура

### Именование (BEM с префиксом `stk-`)

| Класс                          | Описание |
|--------------------------------|----------|
| `.stk-dropdown-wrapper`        | Обёртка компонента |
| `.stk-dropdown-arrow`          | Кнопка-стрелка |
| `.stk-dropdown-list`           | Список элементов (ul) |
| `.stk-dropdown-item`           | Элемент списка (li) |
| `.stk-dropdown-item_selected`  | Выбранный элемент |
| `.stk-dropdown-item_focused`   | Элемент в фокусе (keyboard) |
| `.stk-dropdown-item_disabled`  | Заблокированный элемент |
| `.stk-multiselect-wrapper`     | Обёртка multiselect |
| `.stk-multiselect-tags`        | Область тегов |
| `.stk-multiselect-tag`         | Тег-чип |
| `.stk-multiselect-tag__remove` | Кнопка удаления тега |

### Кастомизация через CSS Custom Properties

```css
:root {
  --stk-dropdown-bg: #fff;
  --stk-dropdown-border: #ccc;
  --stk-dropdown-border-radius: 4px;
  --stk-dropdown-item-hover: #f0f0f0;
  --stk-dropdown-item-selected: #e0e7ff;
  --stk-dropdown-tag-bg: #e0e7ff;
  --stk-dropdown-tag-color: #1e40af;
  --stk-dropdown-font-size: 14px;
}
```

### Принципы

- Базовые стили в `base-component.css` — обёртка, попап, кнопка-стрелка, общий список.
- Компонентные стили в отдельных CSS-файлах — специфика каждого компонента.
- Компонент не зависит от глобальных стилей, использует `box-sizing: border-box` на обёртке.
- Минимальный reset.

---

## 10. Управление состоянием через StkProxyStateManager

- Каждый компонент создаёт `StkProxyStateManager<ConcreteState>` с типизированным начальным состоянием.
- **`subscribe`** — реактивный рендеринг:
  - Подписка на `items` → перерендер списка.
  - Подписка на `selectedItem` / `selectedItems` → обновление инпута / тегов.
  - Подписка на `opened` → toggle попапа.
- **`set`** — для атомарных изменений (`opened`, `filterText`).
- **`update`** — для сложных обновлений (toggle `allSelected`, добавление/удаление из `selectedItems`).
- Доступ к менеджеру состояния из подклассов через `protected _stateManager`.

---

## 11. План тестирования
Будет запущен в работу - только после финальной реализации всех 3 компонентов и демо-страницы.

### Юнит-тесты (vitest + jsdom)

| Компонент | Тестовые сценарии |
|-----------|------------------|
| **BaseEventEmitter** | `on`/`off`/`once`/`emit` — корректность подписок |
| **BaseComponent** | Создание DOM-структуры, `open`/`close`/`destroy`, portal |
| **DropdownComponent** | Рендеринг items, select, keyboard, disabled items |
| **ComboboxComponent** | Фильтрация, стратегии, «ничего не найдено», select |
| **MultiselectComponent** | Множественный выбор, «Выбрать все», теги, `maxSelectedItems` |

### Ручное тестирование

- Демо-страница `index.html` со всеми 3 компонентами.

---

## 12. Документация и примеры
Должна быть максимально доступна и продуманная, с примерами кода для каждого компонента.

- Обновить `README.md`: описание библиотеки, установка, API каждого компонента с примерами кода.
- Обновить `index.html` + `src/index.ts`: демо-страница с 3 инпутами и примерами использования.
- JSDoc-комментарии на все публичные методы и типы.

---

## 13. Порядок реализации (фазы)

| Фаза | Что делать | Зависимости |
|------|-----------|-------------|
| **1. Типы** | Расширить `types.ts` — все интерфейсы, типы props, events, state | —           |
| **2. BaseComponent рефакторинг** | Дженерики, protected stateManager, кнопка-стрелка, click-outside, destroy, open/close/toggle, keyboard (Escape) | Фаза 1      |
| **3. DropdownComponent** | Полная реализация: рендер списка, выбор, keyboard, стили | Фаза 2      |
| **4. ComboboxComponent** | Фильтрация, редактируемый инпут, стратегии, стили | Фаза 2      |
| **5. MultiselectComponent** | Теги, чекбоксы, «Выбрать все», maxSelectedItems, стили | Фаза 2      |
| **6. Демо + Документация** | index.html, README.md, JSDoc | Фазы 3–5    |
| **7. Тесты** | Юнит-тесты для всех компонентов | Фаза 6      |

---

## 14. Открытые вопросы

1. **Accessibility (a11y):** Нужна ли поддержка ARIA-атрибутов (`role="listbox"`, `aria-expanded`, `aria-selected`, `aria-activedescendant`)? **Рекомендация: да**, это стандарт для таких компонентов. Отвечаю: да, но только после фазы виртуализации. Фаза виртуализации после тестирования.
2. **Анимации:** Нужны ли CSS-переходы при открытии/закрытии попапа (fade/slide)? Если да — добавить как опцию `animation?: 'fade' | 'slide' | 'none'`. Отвечаю: да, нужны, как фича + добавить возможность полностью отключить анимации.
3. **Виртуальный скролл:** При большом количестве элементов (>1000) список может тормозить. Нужна ли виртуализация, или это отдельная фаза? - Отвечаю: да, нужна, но полностью отдельной файзой.
4. **Темизация:** Достаточно ли CSS Custom Properties, или нужна поддержка CSS-классов-темы (`.stk-theme-dark`)? - Отвечаю: нет нужды в темизации.

