# План: DataSource + DOM-оптимизация (mount/unmount списка)

Два независимых улучшения, не ломающих текущий публичный API.

---

## Фича 1 — DataSource: асинхронные данные

### Мотивация

Сейчас компоненты принимают только синхронный массив `items: DropdownItem[]`.
Нужна поддержка асинхронного источника — Promise, функция-фетчер — как `dataSource` в Kendo UI.

### 1.1 Новые типы — `types.ts`

```ts
// Варианты входного источника
export type DataSourceInput<T> =
  | T[]
  | Promise<T[]>
  | (() => Promise<T[]>);

// События DataSource
export type DataSourceEvents<T> = {
  loading: void;   // старт запроса
  load: T[];       // успешная загрузка
  error: unknown;  // ошибка
};
```

Изменить props компонентов — `items` становится опциональным, добавляется `dataSource`:

```ts
export type DropdownComponentProps = {
  selector: string | HTMLInputElement;
  items?: DropdownItem[];                  // ← было обязательным
  dataSource?: DataSource<DropdownItem>;   // ← новое
  placeholder?: string;
  value?: string | number;
};
// Аналогично для ComboboxComponentProps и MultiselectComponentProps
```

> Runtime-guard в конструкторах: `if (items && dataSource) throw` — не оба вместе.
> `items` и `dataSource` взаимно исключают друг друга.

---

### 1.2 Новый файл — `src/lib/data-source.ts`

**Класс `DataSource<T>` extends `BaseEventEmitter<DataSourceEvents<T>>`**

#### Поля

| Поле | Тип | Описание |
|------|-----|----------|
| `_input` | `DataSourceInput<T>` | Исходный источник |
| `_cache` | `T[] \| null` | Кэш последнего результата |
| `_loading` | `boolean` | Флаг активной загрузки |

#### Конструктор

```ts
constructor(input: DataSourceInput<T>)
```

Если `Array.isArray(input)` — сразу кладёт в `_cache`, не эмитит `loading`.

#### Публичные методы

| Метод | Сигнатура | Описание |
|-------|-----------|----------|
| `fetch` | `(force?: boolean): Promise<T[]>` | Если есть кэш и `force !== true` — возвращает кэш без запроса. Иначе: `emit('loading')` → выполнить запрос → положить в `_cache` → `emit('load', data)`. При ошибке — `emit('error', err)`, пробросить. |
| `getData` | `(): T[] \| null` | Синхронный геттер кэша. |
| `invalidate` | `(): void` | Сброс кэша (`_cache = null`). |
| `isLoading` | `(): boolean` | Флаг загрузки. |

#### Внутренняя логика `fetch()`

```
1. Array.isArray(_input)        → вернуть _input (без запроса)
2. typeof _input === 'function' → вызвать _input() → Promise
3. _input instanceof Promise    → использовать напрямую
```

---

### 1.3 Изменения в `base-component.ts`

#### Новые поля

```ts
private _dataSource: DataSource<DropdownItem> | null = null;
private _dsUnsubscribers: Unsubscribe[] = [];
private readonly _loadingElement = document.createElement('div');
```

#### Новый protected метод `_initDataSource(ds: DataSource<DropdownItem>): void`

```
1. Сохранить ссылку: this._dataSource = ds
2. Подписаться на ds.on('loading')  → this._showLoading()
3. Подписаться на ds.on('load', items) → this._hideLoading(); this.setItems(items)
4. Подписаться на ds.on('error', err) → this._hideLoading(); console.error(err)
5. Сохранить все unsubscribe-функции в _dsUnsubscribers
6. Если ds.getData() !== null → this.setItems(ds.getData()!) (синхронный путь)
7. Иначе → void ds.fetch() (асинхронный путь)
```

#### Новые private методы

```ts
private _showLoading(): void
// Вставить _loadingElement в popoverWrapper
// Добавить класс stk-dropdown-popover_loading
// Открыть попап чтобы был виден индикатор

private _hideLoading(): void
// Убрать _loadingElement из popoverWrapper
// Снять класс stk-dropdown-popover_loading
```

#### `setItems()` — абстрактная сигнатура в BaseComponent

Добавить в BaseComponent:
```ts
public abstract setItems(items: DropdownItem[]): void;
```
Конкретная реализация уже есть в каждом подклассе — этот шаг только поднимает сигнатуру наверх.

#### `destroy()` — добавить очистку DataSource-подписок

```ts
public destroy(): void {
  // ...существующий код...
  this._dsUnsubscribers.forEach(unsub => unsub());
  this._dsUnsubscribers = [];
}
```

---

### 1.4 Изменения в конструкторах подклассов

```ts
// DropdownComponent, ComboboxComponent, MultiselectComponent
constructor(props: ComponentProps) {
  const { selector, items, dataSource, ... } = props;

  if (items && dataSource) {
    throw new Error('[ComponentName]: передайте items ИЛИ dataSource, но не оба');
  }

  // super() с dataItems: [] если items не передан
  super({ selector, state: { ..., dataItems: items ?? [], ... } });

  // Инициализация источника
  if (dataSource) {
    this._initDataSource(dataSource);
  }
}
```

---

### 1.5 CSS для индикатора загрузки — `base-component.css`

```css
.stk-dropdown-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  color: var(--stk-dropdown-item-disabled-color);
  font-size: var(--stk-dropdown-font-size);
  gap: 8px;
}

.stk-dropdown-loading::before {
  content: '';
  width: 14px;
  height: 14px;
  border: 2px solid var(--stk-dropdown-border);
  border-top-color: var(--stk-dropdown-border-focus);
  border-radius: 50%;
  animation: stk-spin 0.6s linear infinite;
}

@keyframes stk-spin {
  to { transform: rotate(360deg); }
}
```

---

### 1.6 Экспорт из `src/lib/index.ts`

```ts
export { DataSource } from './data-source';
export type { DataSourceInput, DataSourceEvents } from './types';
```

---

### 1.7 Публичный API

```ts
// Вариант A — функция-фетчер (рекомендуется: ленивая загрузка + переиспользуемость)
const ds = new DataSource(() => fetch('/api/cities').then(r => r.json()));
const dropdown = new DropdownComponent({ selector: '#city', dataSource: ds });

// Вариант B — готовый Promise
const ds = new DataSource(fetch('/api/items').then(r => r.json()));

// Вариант C — статический массив (поведение без изменений)
const dropdown = new DropdownComponent({ selector: '#fruit', items: fruits });

// Повторный запрос (например, по кнопке "Обновить")
ds.fetch(true); // force=true → игнорирует кэш

// Подписка на события DataSource
ds.on('loading', () => showSpinner());
ds.on('load', (items) => console.log('Загружено:', items.length));
ds.on('error', (err) => showErrorMessage(err));
```

---

## Фича 2 — DOM mount/unmount: удаление списка при закрытии

### Мотивация

При 2000+ `dataItems` и 7–12 компонентах на странице — тысячи `<li>` всегда находятся в DOM дереве, что критически нагружает браузер (layout, compositing, memory).

**Решение:** монтировать `_listElement` в DOM только при открытом попапе, демонтировать при закрытии.

---

### 2.1 Изменения в `base-component.ts` — hooks

Добавить два protected hook-метода с пустой реализацией по умолчанию:

```ts
/** Вызывается когда попап открывается (до display: block) */
protected _onPopoverOpen(): void {}

/** Вызывается когда попап закрывается (до display: none) */
protected _onPopoverClose(): void {}
```

Изменить подписку на `opened` в `_setupSubscriptions()`:

```ts
this._stateManager.subscribe('opened', (isOpened) => {
  if (isOpened) {
    this._onPopoverOpen();            // ← hook: подкласс монтирует список
    this.popoverWrapper.style.display = 'block';
    void this._updatePosition();
    this.emit('open', ...);
  } else {
    this._onPopoverClose();           // ← hook: подкласс демонтирует список
    this.popoverWrapper.style.display = 'none';
    this.emit('close', ...);
  }
});
```

---

### 2.2 Рефакторинг `_initList()` в каждом подклассе

Разбить текущий `_initList()` на три метода:

#### `_setupListListeners(): void` — вызывается **один раз** в конструкторе

- Устанавливает `_listElement.className`
- Вешает делегирование **на `popoverWrapper`** (а не на `_listElement`):

```ts
// ДО (текущий код):
this._listElement.addEventListener('mousedown', handler);

// ПОСЛЕ:
this.popoverWrapper.addEventListener('mousedown', handler);
```

`handler` уже использует `.closest('.stk-dropdown-item')` — работает корректно при любом родителе.

> Причина переноса: при `_listElement.remove()` и повторном `appendChild` обработчики на `_listElement` сохраняются (они не теряются при detach/attach). Но перенос на `popoverWrapper` — более чистое решение: обработчик живёт на стабильном элементе.

#### `_mountList(): void` — вызывается при открытии

```ts
protected _mountList(): void {
  this.popoverWrapper.appendChild(this._listElement);
  this._renderItems();
}
```

#### `_unmountList(): void` — вызывается при закрытии

```ts
protected _unmountList(): void {
  this._listElement.innerHTML = '';
  this._listElement.remove();
}
```

---

### 2.3 Override hooks в каждом подклассе

```ts
// DropdownComponent, ComboboxComponent, MultiselectComponent
protected override _onPopoverOpen(): void {
  this._mountList();
}

protected override _onPopoverClose(): void {
  this._unmountList();
}
```

Для **`MultiselectComponent`**: `_mountList()` должен вставлять `_listElement` после возможного элемента-лоадера (если DataSource загружает), порядок важен.

---

### 2.4 Guard в подписках состояния — Вариант A (рекомендуется)

В методах `_setupDropdownSubscriptions()`, `_setupComboboxSubscriptions()`, `_setupMultiselectSubscriptions()` добавить guard:

```ts
this._stateManager.subscribe('dataItems', () => {
  if (this._stateManager.get('opened')) {  // ← guard
    this._renderItems();
  }
});
```

Это предотвращает бессмысленный рендер в `innerHTML` несмонтированного элемента при обновлении `dataItems` в фоне (например, после загрузки через DataSource пока попап закрыт).

---

### 2.5 Гарантия корректного скролла

В `_mountList()` — после `_renderItems()` — восстановить фокус если он был:

```ts
protected _mountList(): void {
  this.popoverWrapper.appendChild(this._listElement);
  this._renderItems();
  // Восстановить позицию скролла если focusedIndex > -1
  this._scrollToFocusedItem();
}
```

---

## Файловая структура изменений

| Действие | Файл | Фича |
|----------|------|------|
| 🆕 Создать | `src/lib/data-source.ts` | 1 |
| ✏️ Изменить | `src/lib/types.ts` | 1 |
| ✏️ Изменить | `src/lib/base-component.ts` | 1 + 2 |
| ✏️ Изменить | `src/lib/base-component.css` | 1 |
| ✏️ Изменить | `src/lib/dropdown-component.ts` | 1 + 2 |
| ✏️ Изменить | `src/lib/combobox-component.ts` | 1 + 2 |
| ✏️ Изменить | `src/lib/multiselect-component.ts` | 1 + 2 |
| ✏️ Изменить | `src/lib/index.ts` | 1 |
| 🆕 Создать | `tests/data-source.test.ts` | 1 |
| ✏️ Изменить | `tests/dropdown-component.test.ts` | 2 |
| ✏️ Изменить | `tests/combobox-component.test.ts` | 2 |
| ✏️ Изменить | `tests/multiselect-component.test.ts` | 2 |

---

## Порядок реализации (с учётом зависимостей)

1. **`types.ts`** — `DataSourceInput<T>`, `DataSourceEvents<T>`, опциональные `items?`/`dataSource?` в props
2. **`data-source.ts`** — класс `DataSource<T> extends BaseEventEmitter<DataSourceEvents<T>>`
3. **`base-component.ts` (Фича 2)** — hooks `_onPopoverOpen` / `_onPopoverClose`, встройка в подписку `opened`
4. **`dropdown-component.ts` (Фича 2)** — `_setupListListeners`, `_mountList`, `_unmountList`, override hooks, guard в подписках
5. **`combobox-component.ts` (Фича 2)** — то же самое
6. **`multiselect-component.ts` (Фича 2)** — то же самое
7. **`base-component.ts` (Фича 1)** — `_initDataSource`, `_showLoading`, `_hideLoading`, абстрактный `setItems`, cleanup в `destroy`
8. **`base-component.css`** — стили индикатора загрузки
9. **Подклассы (Фича 1)** — `dataSource?`-ветка в конструкторах
10. **`index.ts`** — экспорт `DataSource`, `DataSourceInput`, `DataSourceEvents`
11. **Тесты** — `data-source.test.ts` + дополнение существующих тестов

---

## Важные архитектурные решения

| Решение | Обоснование |
|---------|-------------|
| `DataSource extends BaseEventEmitter` | Observer-паттерн — компонент подписывается на события загрузки, полная развязка |
| Делегирование на `popoverWrapper` | Обработчик кликов живёт на стабильном элементе, не теряется при mount/unmount `_listElement` |
| Guard `opened` в подписках | Не рендерить в unmounted DOM — экономия CPU при фоновых обновлениях данных |
| Абстрактный `setItems` в `BaseComponent` | Контракт: `_initDataSource` может вызвать `setItems` не зная конкретного подкласса |
| `_cache` в DataSource | Повторный вызов `fetch()` без `force` не делает лишних запросов |
| `invalidate()` в DataSource | Явный контроль над кэшем без магии |
