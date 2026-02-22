# STK Dropdown

Библиотека из 3 компонентов выпадающих списков на чистом TypeScript — **Dropdown**, **Combobox**, **Multiselect**.

Компоненты построены на классовой ООП-архитектуре с чёткой иерархией наследования:

```
BaseEventEmitter           ← абстрактный, on/off/once/emit
    └── BaseComponent      ← обёртка, инпут, стрелка, попап, floating-ui
            ├── DropdownComponent    ← readonly-инпут, одиночный выбор
            ├── ComboboxComponent    ← текстовый ввод, фильтрация, одиночный выбор
            └── MultiselectComponent ← теги-чипы, чекбоксы, множественный выбор
```

## Зависимости

- [`@floating-ui/dom`](https://floating-ui.com/) — позиционирование попапа
- [`stk-proxy-state-manager`](https://github.com/StarkElessar/stk-proxy-state-manager) — реактивное управление состоянием

## Установка

```bash
npm install
```

## Запуск

```bash
# Dev-сервер с демо-страницей
npm run dev

# Сборка
npm run build

# Тесты
npm run test

# Тесты в watch-режиме
npm run test:watch

# Тесты с покрытием
npm run test:coverage
```

---

## DropdownComponent

Выпадающий список с одиночным выбором. Инпут readonly — пользователь не может вводить текст, только выбирать из списка.

### Использование

```ts
import { DropdownComponent } from './lib';

const dropdown = new DropdownComponent({
  selector: '#my-input',       // CSS-селектор или HTMLInputElement
  items: [
    { value: 1, text: 'Яблоко' },
    { value: 2, text: 'Апельсин' },
    { value: 3, text: 'Банан' },
    { value: 4, text: 'Виноград', disabled: true },
  ],
  placeholder: 'Выберите фрукт...',   // опционально
  value: 2,                            // опционально — начальное значение
});
```

### Опции

| Опция | Тип | Описание |
|-------|-----|----------|
| `selector` | `string \| HTMLInputElement` | CSS-селектор или ссылка на элемент |
| `items` | `DropdownItem[]` | Массив элементов списка |
| `placeholder` | `string` | Текст-подсказка в инпуте |
| `value` | `string \| number` | Начально выбранное значение |

### Методы

```ts
// Получить выбранный элемент
const selected = dropdown.value();       // DropdownItem | null

// Программно выбрать элемент
dropdown.value(2);                       // выбрать по value

// Обновить список
dropdown.setItems([...newItems]);

// Управление попапом
dropdown.open();
dropdown.close();
dropdown.toggle();

// Управление доступностью
dropdown.disable();
dropdown.enable();

// Уничтожить компонент
dropdown.destroy();
```

### События

```ts
dropdown.on('change', (item) => {
  console.log('Выбрано:', item?.text);
});

dropdown.on('open', () => console.log('Открыт'));
dropdown.on('close', () => console.log('Закрыт'));

// Отписка
const unsub = dropdown.on('change', handler);
unsub(); // отписка

// Одноразовая подписка
dropdown.once('change', handler);

// Удалить всех подписчиков события
dropdown.off('change');
```

### Keyboard

| Клавиша | Действие |
|---------|----------|
| `ArrowDown` / `ArrowUp` | Навигация по списку |
| `Enter` / `Space` | Выбрать сфокусированный элемент |
| `Escape` | Закрыть попап |

---

## ComboboxComponent

Компонент с текстовым вводом и фильтрацией списка. Одиночный выбор. Инпут редактируемый — пользователь печатает для поиска.

### Использование

```ts
import { ComboboxComponent } from './lib';

const combobox = new ComboboxComponent({
  selector: '#my-input',
  items: [
    { value: 'msk', text: 'Москва' },
    { value: 'spb', text: 'Санкт-Петербург' },
    { value: 'nsk', text: 'Новосибирск' },
  ],
  placeholder: 'Начните вводить город...',
  filter: 'contains',       // 'contains' | 'startsWith' | 'none'
  minFilterLength: 0,        // минимум символов для фильтрации
  debounce: 150,             // задержка фильтрации в мс
});
```

### Опции

| Опция | Тип | По умолчанию | Описание |
|-------|-----|-------------|----------|
| `selector` | `string \| HTMLInputElement` | — | CSS-селектор или ссылка на элемент |
| `items` | `DropdownItem[]` | — | Массив элементов |
| `placeholder` | `string` | — | Подсказка |
| `value` | `string \| number` | — | Начальное значение |
| `filter` | `FilterStrategy` | `'contains'` | Стратегия фильтрации |
| `minFilterLength` | `number` | `0` | Мин. длина текста для фильтрации |
| `debounce` | `number` | `150` | Задержка фильтрации (мс) |

### Методы

```ts
// Получить / установить значение
combobox.value();       // DropdownItem | null
combobox.value('msk');  // выбрать по value

// Обновить список
combobox.setItems([...newItems]);

// Программная фильтрация
combobox.filter('мос');

// open / close / toggle / disable / enable / destroy — аналогично Dropdown
```

### События

```ts
combobox.on('change', (item) => {
  console.log('Выбрано:', item?.text);
});

combobox.on('filtering', (text) => {
  console.log('Фильтр:', text);
});

combobox.on('open', () => {});
combobox.on('close', () => {});
```

### Keyboard

| Клавиша | Действие |
|---------|----------|
| `ArrowDown` / `ArrowUp` | Навигация по списку |
| `Enter` | Выбрать сфокусированный элемент |
| `Escape` | Закрыть попап |

---

## MultiselectComponent

Компонент множественного выбора с тегами-чипами и чекбоксами. Попап не закрывается после выбора.

### Использование

```ts
import { MultiselectComponent } from './lib';

const multiselect = new MultiselectComponent({
  selector: '#my-input',
  items: [
    { value: 'red', text: 'Красный' },
    { value: 'blue', text: 'Синий' },
    { value: 'green', text: 'Зелёный' },
    { value: 'black', text: 'Чёрный', disabled: true },
  ],
  placeholder: 'Выберите цвета...',
  showSelectAll: true,          // кнопка «Выбрать все»
  maxSelectedItems: 5,          // лимит выбранных элементов
  tagMode: 'multiple',          // 'multiple' | 'single'
  values: ['red', 'blue'],      // начально выбранные
});
```

### Опции

| Опция | Тип | По умолчанию | Описание |
|-------|-----|-------------|----------|
| `selector` | `string \| HTMLInputElement` | — | CSS-селектор или ссылка на элемент |
| `items` | `DropdownItem[]` | — | Массив элементов |
| `placeholder` | `string` | — | Подсказка |
| `values` | `(string \| number)[]` | — | Начально выбранные значения |
| `showSelectAll` | `boolean` | `false` | Показать «Выбрать все» |
| `maxSelectedItems` | `number` | `Infinity` | Максимум выбранных |
| `tagMode` | `TagMode` | `'multiple'` | Режим тегов |

### Режимы тегов (`tagMode`)

- **`'multiple'`** — каждый выбранный элемент отображается отдельным тегом с кнопкой ×
- **`'single'`** — один суммарный тег «Выбрано: N»

### Методы

```ts
// Получить выбранные элементы
multiselect.value();                // DropdownItem[]

// Программно выбрать
multiselect.value(['red', 'blue']); // выбрать указанные
multiselect.value([-1]);            // выбрать все
multiselect.value([]);              // снять все

// Обновить список
multiselect.setItems([...newItems]);

// open / close / toggle / disable / enable / destroy — аналогично Dropdown
```

### События

```ts
multiselect.on('change', (items) => {
  console.log('Выбрано:', items.map(i => i.text).join(', '));
});

multiselect.on('open', () => {});
multiselect.on('close', () => {});
```

### Keyboard

| Клавиша | Действие |
|---------|----------|
| `ArrowDown` / `ArrowUp` | Навигация по списку |
| `Enter` / `Space` | Toggle чекбокса |
| `Backspace` | Удалить последний выбранный (при пустом инпуте) |
| `Escape` | Закрыть попап |

---

## Типы

```ts
/** Элемент списка */
type DropdownItem = {
  value: string | number;
  text: string;
  disabled?: boolean;
};

/** Стратегия фильтрации */
type FilterStrategy = 'contains' | 'startsWith' | 'none';

/** Режим тегов */
type TagMode = 'single' | 'multiple';
```

## Кастомизация (CSS Custom Properties)

```css
:root {
  --stk-dropdown-bg: #fff;
  --stk-dropdown-color: #1f2937;
  --stk-dropdown-border: #d1d5db;
  --stk-dropdown-border-focus: #3b82f6;
  --stk-dropdown-border-radius: 6px;
  --stk-dropdown-font-size: 14px;
  --stk-dropdown-item-hover: #f3f4f6;
  --stk-dropdown-item-selected: #eff6ff;
  --stk-dropdown-item-selected-color: #1d4ed8;
  --stk-dropdown-item-focused: #e0e7ff;
  --stk-dropdown-item-disabled-color: #9ca3af;
  --stk-dropdown-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  --stk-dropdown-popover-max-height: 256px;
  --stk-dropdown-tag-bg: #dbeafe;
  --stk-dropdown-tag-color: #1e40af;
  --stk-dropdown-tag-remove-hover: #1e3a8a;
  --stk-dropdown-transition-duration: 150ms;
}
```

## CSS-классы (BEM, префикс `stk-`)

| Класс | Описание |
|-------|----------|
| `.stk-dropdown-wrapper` | Обёртка компонента |
| `.stk-dropdown-wrapper_opened` | Модификатор: попап открыт |
| `.stk-dropdown-wrapper_disabled` | Модификатор: компонент заблокирован |
| `.stk-dropdown-input` | Инпут |
| `.stk-dropdown-arrow` | Кнопка-стрелка |
| `.stk-dropdown-arrow_opened` | Стрелка повёрнута (попап открыт) |
| `.stk-dropdown-popover` | Контейнер попапа |
| `.stk-dropdown-list` | Список `<ul>` |
| `.stk-dropdown-item` | Элемент списка `<li>` |
| `.stk-dropdown-item_selected` | Выбранный элемент |
| `.stk-dropdown-item_focused` | Элемент с keyboard-фокусом |
| `.stk-dropdown-item_disabled` | Заблокированный элемент |
| `.stk-dropdown-no-results` | «Ничего не найдено» |
| `.stk-multiselect-wrapper` | Обёртка multiselect |
| `.stk-multiselect-tags` | Контейнер тегов |
| `.stk-multiselect-tag` | Тег-чип |
| `.stk-multiselect-tag__text` | Текст тега |
| `.stk-multiselect-tag__remove` | Кнопка удаления тега × |
| `.stk-multiselect-list` | Список с чекбоксами |
| `.stk-multiselect-item_select-all` | «Выбрать все» |

## Архитектура

### BaseEventEmitter (абстрактный)

Обеспечивает событийную модель. Методы:
- `on(event, callback)` — подписка, возвращает функцию отписки
- `once(event, callback)` — одноразовая подписка
- `off(event)` — удалить всех подписчиков события
- `emit(event, payload)` — вызвать событие (protected)

### BaseComponent (абстрактный, наследует BaseEventEmitter)

Реализует общую DOM-структуру и поведение:
- Оборачивает `<input>` в wrapper, добавляет кнопку-стрелку
- Portal для попапа + позиционирование через `@floating-ui/dom`
- Реактивное состояние через `StkProxyStateManager`
- Click-outside, Escape, focus → open
- `open()`, `close()`, `toggle()`, `enable()`, `disable()`, `destroy()`
- Абстрактный метод `_renderItems()` — реализуется подклассами

### Конечные компоненты

Наследуют `BaseComponent` и реализуют:
- Рендеринг списка (`_renderItems()`)
- Логику выбора и keyboard-навигации
- Специфичное DOM-дерево (теги, чекбоксы)
- Публичный API (`value()`, `setItems()`, `filter()`)

## Тестирование

Тесты написаны на [Vitest](https://vitest.dev/) + jsdom.

```bash
npm run test          # запуск
npm run test:watch    # watch-режим
npm run test:coverage # с покрытием
```

Покрытие: BaseEventEmitter, BaseComponent, DropdownComponent, ComboboxComponent, MultiselectComponent — 102 теста.
